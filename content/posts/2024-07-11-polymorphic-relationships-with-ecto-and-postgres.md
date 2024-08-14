---
title: Polymorphic associations with Ecto and Postgres
date: 2024-07-11
taxonomies:
  categories: [development]
  tags: [elixir, ecto, sql, postgres]
---

Modeling polymorphic associations in a relational database can be tricky because these databases are designed around the idea of having structured relationships, making it hard to represent entities that can take on different forms without a consistent interface.

<!-- more -->

Imagine you are building a product where users can leave comments across different types of content such as articles and videos. One of the most common approaches to solve this problem is using the infamous `type` column and conditionally querying/ joining things, for instance:

```sql
select * from comments where comment_type = 'videos' and video_id = '42'
select * from comments where comment_type = 'article' and article_id = '42'
```

The obvious disadvantage with this approach is that there's no referential integrity between relationships. This means the database cannot guarantee that an article or video of id `42` exists when this record is inserted or that it will continue existing for the lifecycle of the program.

Another way of solving the same problem is having one additional table per relationship type, like `article_comments` and `video_comments`. This approach is very popular and is already covered in great detail by the Ecto docs on this section: [Polymorphic associations with many to many](https://hexdocs.pm/ecto/polymorphic-associations-with-many-to-many.html). This strategy solves the data integrity issue we had before, but leaves us with a bunch of extra tables we need to maintain, which might not scale depending on your use-case.

# Hold up! There's another way...

What if we use concepts from composition to solve this? We can start by having a lookup table that connects the shared behavior with different types of entities, this modeling strategy is called an **Exclusive Arc**:

```elixir
def change do
  create table(:entity_comments, primary_key: false) do
    add :id, :binary_id,
      generated: "ALWAYS AS (COALESCE(article_id, video_id)) stored"

    add :comment_id, references(:comments, on_delete: :delete_all), null: false

    add :article_id, references(:articles, on_delete: {:nilify, [:article_id]})
    add :video_id, references(:videos, on_delete: {:nilify, [:video_id]})
  end

  create constraint(:entity_comments, :single_association,
    check: "num_nonnulls(article_id, video_id) = 1")

  create unique_index(:entity_comments, :article_id, where: "article_id IS NOT NULL")
  create unique_index(:entity_comments, :video_id, where: "video_id IS NOT NULL")
end
```

## Let's break it down

If you have worked with Ecto before, the migration code is pretty self-explanatory, if you have not, this should be easily translatable to raw SQL (just ask Chat GPT 😝). Here are the important parts:

```elixir
add :id, :binary_id,
  generated: "ALWAYS AS (COALESCE(article_id, video_id)) stored"
```

This guarantees that we always have an id that points exactly to the relationship we are currently representing. Later we can define `has_many` relationships, without having to conditionally filter the exact columns.

```elixir
create constraint(:entity_comments, :single_association,
  check: "num_nonnulls(article_id, video_id) = 1")
```

Here we define a constraint that makes sure that only one of those columns are filled at a time, which means that any given comment is only associated to an article or video and never both at the same time.

---

In conclusion, this strategy allows us to leverage database constraints in a very flexible way without all the hassle of creating a bunch of additional tables. Then, when the system eventually grows, we only need to add another column without having to touch anything else on the system - pretty cool trick if you ask me 😉👍.

{{ giphy(id="kaBU6pgv0OsPHz2yxy") }}

---

**References**

- [Hashrocket. (n.d.). Modeling Polymorphic Associations in a Relational Database](https://hashrocket.com/blog/posts/modeling-polymorphic-associations-in-a-relational-database)
- [Scheufler, B. (2022, May 22). Modeling Polymorphic Relations in PostgreSQL](https://brunoscheufler.com/blog/2022-05-22-modeling-polymorphic-relations-in-postgres)
