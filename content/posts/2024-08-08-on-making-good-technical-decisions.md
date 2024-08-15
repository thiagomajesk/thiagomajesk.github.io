---
title: On making good techical decisions
date: 2024-08-08
taxonomies:
  categories: [development]
  tags: [software, career]
---

There's a quote that most Software Engineers love to use that always intrigued me: "Pick the right tool for the job". If you take this quote at face value it seems pretty reasonable, right!? Who in good faith would argue that a saw is a better tool to pound a nail than a hammer? The problem is that a simplistic example like this often leads to an equally simplistic logical conclusion far from the practical reality of software engineering.

<!-- more -->

What bothers me about this quote is that most people end up conflating "right" with "best" and completely lose track of the fact that every single piece of technology has tradeoffs. This narrow mindset becomes problematic when it reduces an essentially nuanced principle to a mere catchphrase that people can repeat without giving a second thought to what it encompasses - _The amount of variables involved in making such decisions goes far beyond the technical sphere._

> It isn't easy to know all the requirements, and it isn't easy to know what tool set those requirements imply, especially as both tool sets and requirements are apt to change.

# Wicked problems

Wicked problems are issues so complex that solving one part often creates new challenges elsewhere. They don't have straightforward solutions because they're deeply interconnected with other problems, making them tough to tackle. Wicked problems are defined by the following characteristics:

- You only understand the problem after solving it; defining the problem and solution are essentially the same.
- You can't easily tell when the problem is solved. The problem-solving process ends when resources are depleted.
- Without clear criteria, deciding if the problem is "solved" is completely subjective and there's no right or wrong
- Each problem is essentially unique and past solutions don't fully apply to new problems.
- Every solution is a "one-shot operation" because there's no opportunity to learn by trial and error.
- Solutions aren't predefined, each solution must be created specifically to solve a given problem.

Jeff Atwood, the creator of both Stack Overflow and Discourse also classifies software development as a Wicked Problem, which makes a lot of sense when you consider the sheer number of ramifications involved in the whole process:

> As far as I'm concerned, all software development can be classified as a Wicked Problem. It's far too complex and far too annoyingly micro-complicated to allow for a whole lot of rational planning. I know from personal experience that I can never get very far without writing code to better understand the problem I am trying to solve.

It's also important to say that people often have completely different sets of expectations on how to solve a given problem, and considering both contextual constraints and available resources, finding the absolute optimal solution becomes an impossibility.

> Wicked problems arise when an organization must deal with something new, with change, and when multiple stakeholders have different ideas about how the change should take place.

What this means in practice is that if a problem is not bounded, meaning it has no clear measurable constraints, any solution becomes subjective and by definition, equally valid (_If you can't measure it, you can't improve it_).

# Asymmetric Opportunities

Naval Ravikant, CEO of AngelList, coined the term "Asymmetric Opportunities" which refers to situations where the potential for positive outcomes of an action vastly surpasses the negative outcomes. The imbalance in the risk and reward dynamic creates an attractive scenario that facilitates making decisions when facing adversity.

{{ media(type="image", file="asymetric-opportunities.png", alt="Asymetric Opportunities") }}

Using the concept of Asymmetric Opportunities as a critical thinking tool means that every problem can be framed as a simple risk/reward representation. This is a powerful way of dealing with uncertainty because it forces you to define what success and failure mean in objective terms. This mental model allows us to naturally translate Wicked Problems into Tame Problems.

> The appropriate way to tackle wicked problems is to discuss them. Consensus emerges through the process of laying out alternative understandings of the problem, competing interests, priorities and constraints. The application of more formal analysis tools is impossible before the problem can be articulated in a concise, agreed upon, well-bounded manner. In other words, the problem must first be tamed.

# Keep calm and keep walking

You can learn a lot by watching how others in the industry go about solving problems. Some time ago I was reading through some articles from David Heinemeier Hansson (aka DHH) about their development process for the [Hey](https://www.hey.com/) email service. I remember reading this great post called [Worrying Yourself into Excess](https://world.hey.com/dhh/worrying-yourself-into-excess-37e06863) and thinking: _This looks a lot like the idea behind Asymmetric Opportunities_. In this article, DHH explores how easily is to worry about technical decisions that are not solving concrete problems for reasonably assumed risks and how important it is to think critically about what we are solving.

> I think it's incredibly foolish to believe any team of developers, however talented, can plan out an entire project from start to end, forseeing all the contingencies, emergent problems, and weird-ass edge conditions they're bound to run into

Everyone says that Premature Optimization Is the Root of All Evil, but there's also a fine line between over-engineering and under-engineering a solution. It's also important to consider that most people will never have to deal with software that justifies such a degree of micro-optimization, and even at scale, you'll have a different set of constraints that will narrow down the original problem even further.

> Pick an OK tool for the job. Don't try to pick the best one, but try to pick one which you are pretty sure is at least not so bad that it will seriously hamper your work. After all, in the end you, not the tool, will have to do the real work.

Given that no decision is made in a vacuum, it's important to abstain from petty technical discussions and focus on what matters. My recommendation is that unless you have some hard requirements to worry about, there are likely other things you can spend your limited time and energy on. As I mentioned before, all technology is flawed, so pick the tradeoffs you want to deal with, after all, life is too short to worry yourself into excess.

---

**References**

- [C2 Wiki. (n.d.). Pick the Right Tool for the Job](https://wiki.c2.com/?PickTheRightToolForTheJob)
- [C2 Wiki. (n.d.). Pick an OK Tool for the Job](https://wiki.c2.com/?PickAnOkToolForTheJob)
- [Atwood, J. (2007, November 6). Development is Inherently Wicked](https://blog.codinghorror.com/development-is-inherently-wicked/)
- [Hansson, D. H. (2022, June 6). Worrying Yourself into Excess](https://world.hey.com/dhh/worrying-yourself-into-excess-37e06863)
- [Conklin, J. (2002, January). Wicked Problems](https://www.leanessays.com/2002/01/wicked-problems.html)
