---
title: The art of destroying software
date: 2024-07-29
taxonomies:
  categories: [development]
  tags: [drops, software]
---

If you have been working in software for long enough you know that there are endless discussions about what constitutes good software with varying opinions on the matter. In this sea of opinions and everchanging landscape, there's one that I still hold in high regard: Constantine's Law.

<!-- more -->

This was repeated to exhaustion by a great professor of mine back when I was in college and it became to me one of the very few immutable truths in software.

By paraphrasing Constantine's Law, we can state that a characteristic of good software is having "high cohesion and low coupling". You probably heard another version of this when reading about the single responsibility principle: "Gather together the things that change for the same reasons. Separate those things that change for different reasons".

More recently though I discovered yet another term that helps quantify this idea of good software - it's called **deletability**. This idea states that we should optimize code to be easily deleted, reversed, and replaced. Think about it like this: If you remove any given piece of code from your software, what are the vestiges it leaves behind? Greg Young from Erlang Solutions explores this idea a bit further in his talk called The Art of Destroying Software:

{{ youtube(id="1FPsJ-if2RU") }}
