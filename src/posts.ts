import { getCollection, type CollectionEntry } from 'astro:content'
import slugify from '@sindresorhus/slugify'
import { chain } from 'lodash-es'

type Post = CollectionEntry<'posts'>
type Category = { slug: string; name: string }
type Tag = { slug: string; name: string; count: number }

export async function getAllPosts(): Promise<Array<Post>> {
  return (await getCollection('posts')).sort(
    (a, b) => a.data.date.valueOf() - b.data.date.valueOf()
  )
}

export async function getLatestPosts(): Promise<Array<Post>> {
  return (await getAllPosts()).slice(0, 10)
}

export async function getCategoriesWithPosts() {
  return chain(await getAllPosts())
    .groupBy((x) => x.data.category)
    .mapValues((x) =>
      chain(x)
        .orderBy((x) => x.data.date, 'desc')
        .take(5)
        .value()
    )
    .value()
}

export async function getAllCategories(): Promise<Array<Category>> {
  return chain(await getAllPosts())
    .map((p) => ({ slug: slugify(p.data.category), name: p.data.category }))
    .uniqBy((c) => c.slug)
    .value()
}

export async function getPostsByCategory({ name }: Category): Promise<Array<Post>> {
  return chain(await getAllPosts())
    .filter((p) => p.data.category == name)
    .value()
}

export async function getAllTags(): Promise<Array<Tag>> {
  return chain(await getAllPosts())
    .flatMap((p) => p.data.tags)
    .countBy()
    .map((count, name) => ({ slug: slugify(name), name, count }))
    .value()
}

export async function getPostsByTag({ name }: Tag): Promise<Array<Post>> {
  return chain(await getAllPosts())
    .filter((p) => p.data.tags.includes(name))
    .value()
}