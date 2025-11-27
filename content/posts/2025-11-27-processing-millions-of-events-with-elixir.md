---
title: Processing millions of events with elixir
date: 2025-11-27
taxonomies:
  categories: [development]
  tags: [software, elixir, concurrency]
---

A few months ago I watched a talk from Brian Bucklew, the creator of Caves of Qud, where he explains his approach to representing entities in the game simulation. The part that stood out to me was how the eventing system works. It immediately felt like something that would map well to the actor model on the BEAM. With that in mind, I started experimenting and ended up building a small library to support his interpretation of the ECS pattern called [Genesis](https://github.com/thiagomajesk/genesis).

The first version of the library was very rough: All the simulation state was stored in an ETS table owned by a singleton GenServer called "World" which also acted as the main event dispatching mechanism. The heavy processing was done by a "pool" of workers behind a [`PartitionSupervisor`](https://hexdocs.pm/elixir/main/PartitionSupervisor.html) which was a good step to guarantee some concurrency (as each object was routed to a dedicated worker/partition).

```bash
O1 Attack! ---|              |--- [Partition 1] ---> Move! ---> Attack! ---> [Worker]
O1 Move!   ---|              |
O2 Heal!   ---|--> [World] --|--- [Partition 2] ---> Heal! ----------------> [Worker]
O3 Move!   ---|              |
O3 Attack! ---|              |--- [Partition 3] ---> Attack! ---> Move! ---> [Worker]
```

This initial setup guaranteed sequential writes to the ETS table, proper event ordering and some concurrency, which was enough to handle a few thousand objects. However, as soon as I started pushing more events through the system, I quickly realized that this solution was not going to scale. Before we dive any further, here's a quick explanation of how events should be processed:

An event always targets a specific object. That object has a list of behaviors attached to it, and each behavior gets a chance to handle the event in order. Any state changes produced along the way are applied back to the object. Objects don't depend on each other during this step, their events can be processed independently, but each object must run its own sequence of behaviors one at a time. To make this more concrete, imagine we send an event notifying objects about an AoE (Area of Effect) attack that just happened:

```bash
- O1 Damage! ---> [Armor] ---> [Health]
- O2 Damage! ---> [Health]
```

The reason events need to be processed in order is that behaviors attached to an object can also modify the incoming event. In this example, the Armor behavior might reduce the damage before it reaches the object's Health (or even "splash" the damage into other objects if that's a desired mechanic).

Ok, back on track... The first thing I did was creating a benchmark script to push the system to its limits, the goal was to dispatch a single event to a million objects as fast as possible (~60 FPS). Naturally, the solution fell apart, causing huge memory spikes and an ever growing number of reductions in the World GenServer as it couldn't keep up with the load.

I mentioned before that `PartitionSupervisor` was a good step in the right direction, but it brought a few challenges:

- The number of partitions is fixed, meaning that the partition itself might become a bottleneck if the load is uneven between objects (which can definitely happen in this case).
- `PartitionSupervisor` exposes a resize function, which leaves it completely up to us to grow/shrink them. The problem with resizing it though is that partitions are restarted, which can also cause in-flight events to be lost.

> The most relevant metric in our case is the queue length of the worker, but "infoing" a process from the outside will put a lock on that process until we get that information back, which can be expensive if called often. FYI, erlang also provides a cool [`system_monitor`](https://www.erlang.org/doc/apps/erts/erlang.html#system_monitor/2) function that allows us to get some information from process at given thresholds, but that generates reports on the whole system and not just for a specific group of processes.

I had clearly hit a wall, and even though I was surprised by how much an Erlang process can handle on their own with their built-in backpressure, it quickly became clear that I had to reach for a more robust back-pressure system.

Enter GenStage! I had ruled out GenStage at first because I was too caught up in the idea that you need a fixed set of stages, and one property of this event pipeline is that it changes over time as behaviors get attached or removed from objects. What I didn't realize at the time was that I didn't need it to be that dynamic, I just had to figure out a different way to frame the problem, so I did some research, re-read [To spawn, or not to spawn?](https://www.theerlangelist.com/article/spawn_or_not) until it hit me...

It turns out that combining [`GenStage.PartitionDispatcher`](https://hexdocs.pm/gen_stage/GenStage.PartitionDispatcher.html) with [`GenStage.ConsumerSupervisor`](https://hexdocs.pm/gen_stage/ConsumerSupervisor.html) almost exactly matches the design I had in mind, so the topology looks like this:

```bash
            |--- [Producer Consumer] --- [Consumer Supervisor] ---|--- [Worker]
            |                                                     |--- [Worker]
            |
[Producer] -|--- [Producer Consumer] --- [Consumer Supervisor] ---|--- [Worker]
            |                                                     |--- [Worker]
            |
            |--- [Producer Consumer] --- [Consumer Supervisor] ---|--- [Worker]
                                                                  |--- [Worker]
```

> If you haven't used GenStage before, the genius of how it implements back-pressure is that instead of pushing events down the pipeline, consumers create demand (ask for work) from their producers, which means the system never gets more work than it can handle at any given time.

In our particular case, we won't always have a continuous stream of demand like in the benchmark, in fact, the most common use case for this library is much more reactive: the event system reacts to a burst of incoming events from time to time. Because of this requirement, the Producer needs to queue all incoming events and dispatches them to its Consumer Supervisor as soon as they become available.

Here's where the first important piece comes in: our Producer stage uses a `PartitionDispatcher`, so it has multiple Producer Consumers partitions to deliver the work, which creates our first level of concurrency:

```bash
O1 Attack!  |              |  O1 Attack!
O1 Move!    |              |  O1 Move!
            |              |  ----------->
O2 Heal!    |--[Producer]--|  O2 Heal!
            |              |  ----------->
O3 Move!    |              |  O3 Move!
O3 Attack!  |              |  O3 Attack!
```

After events get "partitioned", they fall into a separate pipeline and are guaranteed to be processed concurrently (the number of partitions is defined by [`System.schedulers_online/0`](https://hexdocs.pm/elixir/1.12.3/System.html#schedulers_online/0)). Then our Consumer Supervisor will group events sent to the same object and create a queue of events per object that can be drained individually by the Consumer:

```bash
- O1: --> [Move!] -----> [Attack!] ---> [Consumer] ---> [Worker]
- O2: --> [Heal!] --------------------> [Consumer] ---> [Worker]
- O3: --> [Attack!] ---> [Move!] -----> [Consumer] ---> [Worker]
```

The final piece of the solution is the `ConsumerSupervisor`, it starts a Worker (an Elixir Task) for every group of events for the same object (ie: Move! + Attack!) capped at `max_demand`. When the Worker finishes processing, it dies, the Consumer requests more work, a new one spawns and the cycle continues.

The really neat trick I came up with was to accumulate events in object-specific queues which are marked as "busy" when we have a Worker draining it. A Worker is always assigned to one specific queue and when they are done, they send an "ack" message to their Producer Consumer to check if the queue is completely drained.

This architecture gives us the three guarantees I was looking for:

- **Concurrency**: Events for different objects are processed in parallel
- **Consistency**: Events for the same object are always processed in order
- **Scalability**: Workers are spawned on-demand causing work to be evenly distributed

The result is a system that can handle millions of events while maintaining proper ordering semantics and avoiding the bottlenecks from the initial implementation.
