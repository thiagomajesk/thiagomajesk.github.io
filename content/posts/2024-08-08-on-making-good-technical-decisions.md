---
title: On making good techical decisions
date: 2024-08-08
taxonomies:
  categories: [development]
  tags: [software, career]
---

There's a quote that most Software Engineers love to use which always intrigued me: "pick the right tool for the job". At first glance is seems a pretty reasonable thing to say, right!? Who in good faith would argue that a saw is a better tool to pound a nail than a hammer? A simplistic example like this leads to a equal simplistic logical conclusion that is in fact very far from the practical reality of software engineering.

<!-- more -->

What bothers me about this quote is that most people end up conflating "right" with "best" and completely loose track of the fact that every single piece of technology has tradeoffs. This is problematic because it completely reduces a essentially nuanced principle to a mere catch phrase that you can repeat without giving a second thought to what it encompases.

> It isn't easy to know all the requirements, and it isn't easy to know what tool set those requirements imply, especially as both tool sets and requirements are apt to change.

# Wicked problems

> As far as I'm concerned, all software development can be classified as a Wicked Problem. It's far too complex and far too annoyingly micro-complicated to allow for a whole lot of rational planning. I know from personal experience that I can never get very far without writing code to better understand the problem I am trying to solve.

Wicked problems are issues so complex that solving one part often creates new challenges elsewhere. They don't have straightforward solutions because they're deeply interconnected with other problems, making them tough to tackle. Wicked problems are defined by the following characteristics:

- You only understand the problem after solving it; defining the problem and solution are essentially the same.
- Since the problem is unclear, you can't easily tell when it's solved. The problem solving process ends when resources are depleted.
- Without clear criteria, deciding if the problem is "solved" is completely subjective and there's not right or wrong
- Each problem is essentially unique and past solutions don't fully apply to new problems.
- Every solution is a "one shot operation" because there's no opportunity to learn by trial and error.
- Solutions aren't predefined, each solution must be created specifically to solve a given problem.

> Wicked problems arise when an organization must deal with something new, with change, and when multiple stakeholders have different ideas about how the change should take place.

Most people have a completely different set of expectations on how to solve a given problem, and considering both contextual constraints and available resources, finding the absolute optimal solution becomes an impossibility.

> The appropriate way to tackle wicked problems is to discuss them. Consensus emerges through the process of laying out alternative understandings of the problem, competing interests, priorities and constraints. The application of more formal analysis tools is impossible before the problem can be articulated in a concise, agreed upon, well-bounded manner. In other words, the problem must first be tamed.

# Asymmetric Opportunities

This concept was originally coined by Naval Ravikant, the CEO of AngelList. Asymmetric Opportunities are nothing more than situations where the potential of positive outcomes of an action vastly surpasses the negative outcomes. The imbalance on the risk and reward dynamic creates an attractive scenario that facilitates making decisions.

{{ media(type="image", file="asymetric-opportunities.png", alt="Asymetric Opportunities") }}

Maybe unaware of this, DHH drafted a great post called Worrying Yourself into Excess, that applies the very concept of Asymetric Opportunities. In this article he explores how easily is to worry about technical decisions that are not solving concrete problems for reasonably assumed risks.

> But I think it's incredibly foolish to believe any team of developers, however talented, can plan out an entire project from start to end, forseeing all the contingencies, emergent problems, and weird-ass edge conditions they're bound to run into

Asymetric Opportunities as a critical thinking tool is a pretty powerful way of dealing with uncertainty because it reduces every problem to a simple risk/reward representation, allowing you to better understand dependencies and tackle the problems in a objective fashion. This naturally allows us to transform Wicked Problems into Tame Problems.

> The appropriate way to tackle wicked problems is to discuss them. Consensus emerges through the process of laying out alternative understandings of the problem, competing interests, priorities and constraints. The application of more formal analysis tools is impossible before the problem can be articulated in a concise, agreed upon, well-bounded manner. In other words, the problem must first be tamed.

# Summary

> Pick an OK tool for the job. Don't try to pick the best one, but try to pick one which you are pretty sure is at least not so bad that it will seriously hamper your work. After all, in the end you, not the tool, will have to do the real work.

There's a fine line between over-engineering and under-engineering, but the reality is that most of us will never have to deal with projects that have the same scale as Discord or Netflix, so unless you have a hard requirement, the next time you need to choose a technology, go with whatever brings you the most joy to work with. All technology is flawed, so pick the tradeoffs you want to deal with, after all life is too short to worry yourself into excess.

# References

- [C2 Wiki. (n.d.). Pick the Right Tool for the Job](https://wiki.c2.com/?PickTheRightToolForTheJob)
- [C2 Wiki. (n.d.). Pick an OK Tool for the Job](https://wiki.c2.com/?PickAnOkToolForTheJob)
- [Atwood, J. (2007, November 6). Development is Inherently Wicked](https://blog.codinghorror.com/development-is-inherently-wicked/)
- [Hansson, D. H. (2022, June 6). Worrying Yourself into Excess](https://world.hey.com/dhh/worrying-yourself-into-excess-37e06863)
- [Conklin, J. (2002, January). Wicked Problems](https://www.leanessays.com/2002/01/wicked-problems.html)
