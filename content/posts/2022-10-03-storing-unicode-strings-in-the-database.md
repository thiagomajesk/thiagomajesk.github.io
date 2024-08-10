---
title: Storing unicode strings in the database
date: 2022-10-03
taxonomies:
  categories: [development]
  tags: [elixir, postgres, sql]
---

Recently I had to deal with a really pesky problem during the development of a client's product related to how unicode strings work. During the development of a new feature, we had the need to summarize some long-form text collected from the database.
Because this text was migrated over by a third-party company, we had no knowledge of how it was previously stored and handled during the migration.

<!-- more -->

However, we knew that the original text could contain HTML markup from a rich text WISYWIG editor. So this was our first (naive) try:

```elixir
short_description =
  description
  |> Floki.parse_document!()
  |> Floki.text()
  |> String.slice(0..254)
```

First we parse the HTML fragment and retrieve the text from the element nodes. After that we simply get the first 255 characters from the text. If you are familiar with Ecto, you'll remeber that migrations with the field type `:string` [defaults](https://hexdocs.pm/ecto_sql/Ecto.Migration.html#module-field-types) to a `varchar(255)` column, which is what we used. So, after having the feature deployed to production for quite some time, we were caught by surprise with the following error:

```
ERROR 22001 (string_data_right_truncation) value too long for type character varying(255)
```

The database message is clearly saying that we were trying to store more than the column could hold (255 bytes). But why's that?
After testing and testing some more, we had no clue what was going on. After doing our research, here's what we learned...

# Couting graphemes vs actual string size

If you read Elixir's [String](https://hexdocs.pm/elixir/String.html) module docs, you'll learn that some graphemes may have multiple encondings, especially accented characters in the Unicode Latin-1 script. Take these two words `sintético` and `sintético`, although very similar, they use different encodings as you can see bellow:

```elixir
String.graphemes("sintético")
#=> ["s", "i", "n", "t", "é", "t", "i", "c", "o"]

String.to_charlist("sintético")
# => [115, 105, 110, 116, 101, 769, 116, 105, 99, 111]

String.length("sintético")
#=> 9
```

Even though they have the same length, notice how the codepoints returned by `String.to_charlist/1` are different from the previous one:

```elixir
String.graphemes("sintético")
#=> ["s", "i", "n", "t", "é", "t", "i", "c", "o"]

String.to_charlist("sintético")
#=> [115, 105, 110, 116, 233, 116, 105, 99, 111]

String.length("sintético")
#=> 9
```

Using the unicode jargon, we say that those words are cannonically equivalent, even though they don't have the same representation internally. In the previous example, the character `é` is represented with the codepoints `[101, 769]` and the char `é` with the codepoint `[233]`.

You might still be curious of why the function `String.length/1` returns the same size for both of them, even though they don't use the same codepoints. This happens because the `String` module works with graphemes instead of codepoints. In this particular case, couting graphemes is considered a better solution for UTF-8 strings because a character is counted regardless of it's internal representation. This means that `String.length/1` works more closely to what you expect when you "look" at the string.

When I first learned this, I thought that Elixir was being quirky. However, after carefull examination I see that other languages like Ruby and Javascript are actually conflating the meaning of length and size; which gives you an unexpected result in this scenario (unicode-wise at least).

If you need to store the previous string in a database, you might be tempted to use `String.length/1` to check for its size like we did previously. However, this is a very naive approach, because it does not take the actual size of the encoded string into consideration. Gladly, since Elixir strings are just binaries, we have a simple way to check their actual size:

```elixir
byte_size("sintético")
#=> 10
byte_size("sintético")
#=> 11
```

# String normalization

So, since many functions in the `String` module deal with graphemes directly, something like `String.slice/2` will return the right amount of characters like we expect, but we can't trust it to return the right amount of bytes we want to store. If you are expecting exactly 1 byte per character, you might want to normalize the string first with `String.normalize/2` so you always get the expected amount of bytes per grapheme:

```elixir
String.to_charlist(String.normalize("sintético", :nfd))
#=> [115, 105, 110, 116, 101, 769, 116, 105, 99, 111]

String.to_charlist(String.normalize("sintético", :nfd))
#=> [115, 105, 110, 116, 101, 769, 116, 105, 99, 111]
```

If you want to know more about this, I recommend this excelent article that goes into detail on how unicode normalization works: [https://towardsdatascience.com/what-on-earth-is-unicode-normalization-56c005c55ad](https://towardsdatascience.com/what-on-earth-is-unicode-normalization-56c005c55ad0).

# Finally, storing some information

After going through all of this material, it finally became obvious that if we wanted to store the text regardless of how it was initially represented, we had to normalize the string first. So this what we did in our final solution:

```elixir
short_description =
  description
  |> Floki.parse_document!()
  |> Floki.text()
  |> String.slice(0..254)
  |> String.normalize(:ndf)
```

Before we close this, I want to make final remarks regarding some Postgres peculiarities we learned in the process and leave some literature for posterity... While trying to figure out how to store our summarized text, I discovered that there's no difference in performance between storing a `char(n)`, `varchar(n)` and `text` in Postgres. The [documentation](https://www.postgresql.org/docs/9.6/datatype-character.html) states the following:

> There is no performance difference among these three types, apart from increased storage space when using the blank-padded type, and a few extra CPU cycles to check the length when storing into a length-constrained column. While character(n) has performance advantages in some other database systems, there is no such advantage in PostgreSQL; in fact character(n) is usually the slowest of the three because of its additional storage costs. In most situations text or character varying should be used instead.

If like me, you didn't know about this, you might perhaps make good use of this wiki page: [https://wiki.postgresql.org/wiki/Don%27t_Do_This](https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_char.28n.29#Text_storage).

BTW, the case for Ecto not doing this by default, seems to be compatibility with other databases. So, if you don't have the need to store exactly 'N' amount of characters like we did, I definetelly recommend always using the `text` type and keep the original information intact.

I also want to link two very good videos on the unicode topic that will make things a lot more clear if you are dealing with UTF-8 strings:

{{ youtube(id="MijmeoH9LT4") }}

{{ youtube(id="ut74oHojxqo") }}
