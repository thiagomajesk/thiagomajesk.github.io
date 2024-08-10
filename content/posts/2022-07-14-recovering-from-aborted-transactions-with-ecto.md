---
title: Recovering from aborted transactions with Ecto
date: 2022-07-14
taxonomies:
  categories: [development]
  tags: [elixir, ecto, sql]
---

It's not uncommon to have the need of doing a series of database operations where one depends on the result of another. For those cases, we usually resort to transactions, which allow us to have more control over how we want to persist our data in a single consistent unit of work.

<!-- more -->

So, imagine we have the following scenario: We have a blog engine that diligently keeps track of all created posts. Each time we attempt to create a new Post, a Log with the status of the operation must also be created. Since this logging mechanism is so important to our blog engine, if we can't create both the Post and the Log, we discard the whole operation.

In Ecto, we have two ways of working with transactions, using the [`Ecto.Repo.transaction/2`](https://hexdocs.pm/ecto/3.8.4/Ecto.Repo.html#c:transaction/2) function directly and using the [`Ecto.Multi`](https://hexdocs.pm/ecto/3.8.4/Ecto.Multi.html) module. Since we don't want to keep track of all intermediate states of the operation, Multi is a little bit overkill, so we'll go with the much simpler transaction function:

```elixir
changeset =
  %Post{title: "Recovering from aborted transactions with Ecto"}
  |> Ecto.Changeset.change()
  |> Ecto.Changeset.unique_constraint([:title])

Repo.transaction(fn repo ->
  case repo.insert(changeset) do
    {:ok, post} -> repo.insert!(%Log{status: :success})
    {:error, changeset} -> repo.insert!(%Log{status: :failure})
    end
end)
```

Notice two things in the example above: The first one is that we are using `repo.insert/2` which does not raise if the Post changeset is invalid. This is important because we want to deal with the result of the operation differently on each case. The second thing is that we use `repo.insert!` to create the Log because if this operation fails, we want to raise and make the whole transaction rollback.

> Here I have to stop to make a important remark about Ecto: Since Ecto is not your traditional ORM, it does not do much to help you when things go south. This might sound horrible at first, but after using it for a while you wind up realizing that it's actually a superior model. Since we are closer to the database and don't have to deal with layers uppon layers of abstraction, problems are also simpler to identify and understand.

Getting back to our previous example... What happens if we already have a Post with the same title in the database? If you haven't experienced this scenario before, you might think that since we are checking for a unique constraint, the changeset becomes invalid and the result of the insert will match on the `:error` tuple. However, this is not what happens and here's why: When we use [`unique_constraint/3`](https://hexdocs.pm/ecto/3.8.4/Ecto.Changeset.html#unique_constraint/3) in our changesets, it actually relies on the database to check if the constraint has been violated or not. This means that the changeset can only be invalid **after** the database has already executed the operation. Given that the database attempted an invalid insert inside a transaction, this automatically aborts that transaction and because the transaction is aborted, by the time our code reaches the next `repo.insert!`, it throws this beautifull exception:

```
** (Postgrex.Error) ERROR 25P02 (in_failed_sql_transaction) current transaction is aborted, commands ignored until end of transaction block
```

If like me, you arleady spent a disproportional amount of time seeking to understand why this happened in the first place; I have some good news, there's at least two ways we can solve this problem:

The first solution, which might be the most obvious one is to prevent the database from raising when it checks for the constraint. We can achieve this by setting the `:on_conflict` option to `:nothing`. However, bear in mind that this solution has a catch: Since we are instructing the database to do nothing when it identifies a conflict, our Post still doesn't get inserted and the result will match on `{:ok, post}`. The full solution could look like this:

```elixir
Repo.transaction(fn repo ->
  case repo.insert(changeset, on_conflict: :nothing) do
    {:ok, %{id: nil}} -> # do something here to deal with the edge case
    {:ok, post} -> repo.insert!(%Log{status: :success})
    {:error, changeset} -> repo.insert!(%Log{status: :failure})
    end
end)
```

The second solution, and also my favorite one uses a SQL feature called a [`SAVEPOINT`](https://en.wikipedia.org/wiki/Savepoint). In short, savepoints allow us to prevent that a database error fails the whole transaction by restoring it back to a certain state. Here's how to use it:

```elixir
Repo.transaction(fn repo ->
  case repo.insert(changeset, mode: :savepoint) do
    {:ok, post} -> repo.insert!(%Log{status: :success})
    {:error, changeset} -> repo.insert!(%Log{status: :failure})
    end
end)
```

This simple configuration makes possible to retain the original semantics of our code and without much effort getting rid of that pesky exception - YAY!
