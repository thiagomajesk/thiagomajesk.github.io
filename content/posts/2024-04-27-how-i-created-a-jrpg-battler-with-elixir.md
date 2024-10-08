---
title: How I created a JRPG battler with Elixir
date: 2024-04-27
taxonomies:
  categories: [development]
  tags: [elixir, genservers, phoenix, liveview]
---

Like most developers, I have **lots** of side projects, but there's one in particular that always lures me back in from time to time. This project is an attempt to revive a genre of games that was very popular in the early 2000s called PBBG (Persistent Browser Based Game). If you are not familiar with this kind of game, a PBBG is essentially a game that satisfies the following two criteria:

<!-- more -->

- It's browser-based meaning that the game is played over the internet using only a web browser
- It's persistent meaning that progress in the game is achieved over multiple play sessions

Because of its browser-based nature, most games in this category are simply web apps where you perform a couple of actions on the client, and the server simulates how those actions affect the game world and the other players in it. A while back I thought about getting some inspiration from those games and giving it a new spin, and that's why I want to share how I created a [battle system](https://finalfantasy.fandom.com/wiki/Battle_system) using Elixir and LiveView that emulates the basis for turn-based games like Final Fantasy.

# Actors

The first step is to create a way to represent the entities we can interact with during battle, for this purpose, we'll be creating an `%Actor{}` struct that will hold the necessary information we need. Actors have many properties, but the basic ones are: `hp` and `cp`, the first one defines the actor's Health Points (how long it lasts in combat), and the second one is the actor's Charging Points (how fast it can act in battle). Additionally, the `Actor` module will also contain some helper functions to help us retrieve details about those actors. Here's how some of them work:

- `Actor.ready?/2`: Whether the actor is ready to act or not. An actor is ready when he has filled it's <abbr title="Charging Points">CP</abbr> bar.
- `Actor.tired?/1`: Whether or not the actor is completely depleted of its <abbr title="Charging Points">CP</abbr> resource and can't act in the turn.
- `Actor.allies?/1`: Whether two actors are in the same party or not. This allows us to properly select targets for actions.

# Battle state

Another thing we need is a data structure to track the state of the battle itself, things like how many turns have passed, whose turn is it, how long a turn takes and so on. We are going to create another struct for this called `%State{}`.

```elixir
defmodule State do
  @enforce_keys [:actors, :timescale, :turn_duration]
  defstruct __hash__: nil,
            __events__: [],
            __syncs__: [],
            timescale: nil,
            actors: [],
            turn_count: 0,
            turn_duration: 0,
            turn_expiration: nil,
            active_actor: nil,
            selected_action: nil,
            targets_locked?: false,
            possible_targets: MapSet.new(),
            selected_targets: MapSet.new()

  alias __MODULE__
  alias Battler.Actor

  @doc false
  def new(actors, opts \\ []) do
    timescale = Keyword.get(opts, :timescale, 1000)
    turn_duration = Keyword.get(opts, :turn_duration, 60000)
    actors = Enum.sort_by(actors, & &1.spd, :desc)
    %State{actors: actors, turn_duration: turn_duration, timescale: timescale}
  end

  @doc false
  def export(%State{} = state) do
    keys_to_ignore = [:__events__, :__syncs__, :__hash__]
    changes = Map.drop(state, keys_to_ignore)
    hash = to_string(:erlang.phash2(changes))
    Map.put(changes, :__hash__, Base.encode64(hash))
  end

  @doc """
  Finds the next actor that is ready to act.
  """
  def find_next_actor(%State{} = state) do
    Enum.find(state.actors, &Actor.ready?/1)
  end

  @doc """
  Returns the current round number.
  """
  def get_current_round(%State{} = state) do
    ceil(state.turn_count / length(state.actors))
  end

  @doc """
  List all the actors that are possible targets for the current action.
  """
  def list_possible_targets(%State{} = state) do
    Enum.filter(state.actors, &possible_target?(state, &1))
  end

  @doc """
  List all the actors that were selected as targets for the current action.
  """
  def list_selected_targets(%State{} = state) do
    Enum.filter(state.actors, &selected_target?(state, &1))
  end

  @doc """
  Returns whether the given actor is ready to act or not.
  """
  def actor_ready?(%State{} = state, %Actor{} = actor) do
    state.active_actor != nil and Actor.self?(state.active_actor, actor)
  end

  @doc """
  Returns whether the given actor is a possible target for the current action.
  """
  def possible_target?(%State{} = state, %Actor{} = actor) do
    MapSet.member?(state.possible_targets, actor.id)
  end

  @doc """
  Returns whether the given actor is a selected target for the current action.
  """
  def selected_target?(%State{} = state, %Actor{} = actor) do
    MapSet.member?(state.selected_targets, actor.id)
  end

  @doc """
  Return whether any targets been acquired so far.
  """
  def targets_acquired?(%State{} = state) do
    MapSet.size(state.selected_targets) > 0
  end

  @doc """
  Return whether the given actor can be target by an ally or not.
  """
  def ally_can_target?(%State{} = state, %Actor{} = actor) do
    state.active_actor != nil and
      Actor.allies?(state.active_actor, actor) and
      possible_target?(state, actor)
  end

  @doc """
  Return whether the given actor can be target by an enemy or not.
  """
  def enemy_can_target?(%State{} = state, %Actor{} = actor) do
    state.active_actor != nil and
      Actor.enemies?(state.active_actor, actor) and
      possible_target?(state, actor)
  end

  @doc """
  Return whether the given actor has been selected as target by an ally or not.
  """
  def selected_by_ally?(%State{} = state, %Actor{} = actor) do
    state.active_actor != nil and
      Actor.allies?(state.active_actor, actor) and
      selected_target?(state, actor)
  end

  @doc """
  Return whether the given actor has been selected as target by an enemy or not.
  """
  def selected_by_enemy?(%State{} = state, %Actor{} = actor) do
    state.active_actor != nil and
      Actor.enemies?(state.active_actor, actor) and
      selected_target?(state, actor)
  end

  @doc """
  Sets the given actor as the current active actor and increases the turn count.
  If `nil` is passed, removes the active actor and resets the state (actions and targets).
  When the given actor is already active, resets the state and keeps the active actor.
  """
  def put_active_actor(%State{} = state, actor) do
    case {state.active_actor, actor} do
      {^actor, _} ->
        state
        |> Map.put(:selected_action, nil)
        |> Map.put(:possible_targets, MapSet.new())
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)
        |> Map.put(:active_actor, actor)

      {_, nil} ->
        state
        |> Map.put(:selected_action, nil)
        |> Map.put(:possible_targets, MapSet.new())
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)
        |> Map.put(:active_actor, nil)

      {_, actor} ->
        state
        |> Map.put(:selected_action, nil)
        |> Map.put(:possible_targets, MapSet.new())
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)
        |> Map.put(:active_actor, actor)
        |> Map.update!(:turn_count, &(&1 + 1))
    end
  end

  @doc """
  Updates the currently selected target.
  """
  def put_selected_target(%State{} = state, actor) do
    case actor do
      nil ->
        Map.put(state, :selected_targets, MapSet.new())

      %{id: actor_id} ->
        Map.put(state, :selected_targets, MapSet.new([actor_id]))
    end
  end

  @doc """
  Updates the currently selected action with the given skill.
  If the selected action is the same, it removes it (aka cancels it).
  """
  def put_selected_action(%State{} = state, action) do
    case action do
      nil ->
        state
        |> Map.put(:selected_action, nil)
        |> Map.put(:possible_targets, MapSet.new())
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)

      %{target: :self} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.self?(actor, state.active_actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, targets)
        |> Map.put(:targets_locked?, true)

      %{target: :ally} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.allies?(state.active_actor, actor) and
              not Actor.dead?(actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)

      %{target: :enemy} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.enemies?(actor, state.active_actor) and
              not Actor.dead?(actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)

      %{target: :allies} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.allies?(actor, state.active_actor) and
              not Actor.self?(actor, state.active_actor) and
              not Actor.dead?(actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, targets)
        |> Map.put(:targets_locked?, true)

      %{target: :enemies} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.enemies?(actor, state.active_actor) and
              not Actor.self?(actor, state.active_actor) and
              not Actor.dead?(actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, targets)
        |> Map.put(:targets_locked?, true)

      %{target: :party} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.allies?(actor.party, state.active_actor) and
              not Actor.dead?(actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, targets)
        |> Map.put(:targets_locked?, true)

      %{target: :dead_ally} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.allies?(actor, state.active_actor) and
              Actor.dead?(actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)

      %{target: :dead_enemy} ->
        targets =
          filter_targets(state, fn actor ->
            Actor.enemies?(actor, state.active_actor) and
              Actor.dead?(actor)
          end)

        state
        |> Map.put(:selected_action, action)
        |> Map.put(:possible_targets, targets)
        |> Map.put(:selected_targets, MapSet.new())
        |> Map.put(:targets_locked?, false)
    end
  end

  @doc """
  Recovers the charges for all actors in the battle.
  """
  def recover_actors_charges(%State{} = state) do
    Map.update!(state, :actors, fn actors ->
      Enum.map(actors, &Actor.recover_charge/1)
    end)
  end

  @doc """
  Push changes to the actors returned by the given function.
  """
  def change_actors(%State{} = state, changes, fun)
      when is_function(fun, 1) do
    Map.update!(state, :actors, fn actors ->
      Enum.map(actors, fn actor ->
        if fun.(actor),
          do: Map.merge(actor, changes),
          else: actor
      end)
    end)
  end

  def replace_actors(%State{} = state, new_actors) do
    lookup = Map.new(new_actors, &{&1.id, &1})

    Map.update!(state, :actors, fn old_actors ->
      Enum.map(old_actors, fn old_actor ->
        if new_actor = lookup[old_actor.id],
          do: new_actor,
          else: old_actor
      end)
    end)
  end

  defp filter_targets(%State{actors: actors}, fun)
       when is_function(fun, 1) do
    actors
    |> Enum.filter(fun)
    |> Enum.map(& &1.id)
    |> MapSet.new()
  end
end
```

# Running the simulation

Now that we have a good representation of the internal state, we are going to create the engine that is going to make everything come to life. For this part, we'll be using a [GenServer](https://hexdocs.pm/elixir/GenServer.html). The idea here is to implement a turn-based [CTB](https://finalfantasy.fandom.com/wiki/Charge_Time#Final_Fantasy_Tactics) battle system. Being turn-based requires us to process things in a very specific order. Here's the general flow of the simulation:

- **Battle start**: When all actors have joined and are ready
- **Charging phase**: Charges all actors involved in combat
- **Turn start**: When a given actor is ready to act
- **Combat phase**: Actors engaged in combat fight
- **Cleanup phase**: Resolve outstanding effects on all actors
- **Battle end**: When a victory condition is reached

The battler (our GenServer), will need an `id` and a list of `actors` to start the simulation. When the server starts, we define the duration of each turn and a timescale for the relative time each action takes (this value is 1s by default, which makes the game time 1-1 to real-time):

```elixir
def start_link(%{id: id, actors: actors}) do
  via = {:via, Registry, {Battler.BattlerRegistry, to_string(id)}}
  args = %{actors: actors, timescale: 1000, turn_duration: 30000}
  GenServer.start_link(__MODULE__, args, name: via)
end
```

After the GenServer starts, the `init/1` callback is called and we bootstrap the battle by sending the `:battle_started` event. Once the battle has started the server works like a state machine, going through each phase and processing the logic necessary to make everything happen...

```elixir
def init(args) do
  {actors, args} = Map.pop!(args, :actors)
  state = State.new(actors, Enum.into(args, []))
  {:ok, push_timed_event(state, :battle_started)}
end
```

```elixir
def handle_info(:battle_started, state) do
  {:noreply,
   state
   |> notify_change(:battle_started)
   |> push_event(:charging_phase)}
end
```

Beyond that, any changes that happen to the internal state of the server are made available through a Pub/Sub system (`notify_change/2`). This means that any process that is interested in getting the current simulation state can `subscribe/0` to receive state changes...

```elixir
defp notify_change(%State{} = state, event) do
  notify_event(state, event, State.export(state))
end

defp notify_event(%State{} = state, event, info) do
  case notify({:battler, event, info}) do
    :ok -> log_syncs(state, event)
    {:error, _reason} -> state
  end
end

defp notify(message) do
  Phoenix.PubSub.broadcast(Battler.PubSub, "battler", message)
end
```

# Displaying information

Since we have the simulation state running in the background, it's just a matter of capturing the available information using a LiveView. We start by finding an existing battle and then we proceed to get its current state using `Battler.fetch_state(battler_id)`. Finally, when the WebSocket connection has been established, we call `Battler.subscribe()` to receive further state changes:

```elixir
def mount(_params, _session, socket) do
  {:ok, battler_pid} = find_or_start_battle()

  socket =
    socket
    |> assign(:battler_pid, battler_pid)
    |> assign_state(Battler.fetch_state(battler_pid))

  # Start the combat and go through all the phases
  if connected?(socket), do: Battler.subscribe()

  {:ok, socket}
end
```

Once the LiveView is subscribed to a battle running in the background, it works mostly like a dumb terminal (a view into the simulation). This means that anyone connected to that room can watch in real-time the exact same thing... Going forward, the only remaining task is to receive the events and update the UI accordingly. In this case, I'm just replacing the LiveView state with the new one coming from the server, but this could easily be optimized to respond only to specific events.

```elixir
def handle_info({:battler, battle_event, state}, socket) do
  pid = socket.assigns.battler_pid
  event = String.upcase(Phoenix.Naming.humanize(battle_event))
  Logger.info("#{event} \t ON #{inspect(self())} FROM #{inspect(pid)}")
  {:noreply, assign_state(socket, state)}
end
```

Here's the repository with the complete source code: [https://github.com/thiagomajesk/battler](https://github.com/thiagomajesk/battler).
The video bellow is a demo that shows the final result once you have all the pieces put together, take a look:

{{ media(type="video", file="battler-demo.mp4", alt="LiveView Battler Demo") }}
