---
title: Obsidian Workflow
description: Write notes in Obsidian, publish them to your blog automatically.
---

# Blogging with Obsidian

## What is Obsidian?

**Obsidian is a local note-taking app** — think of it as a supercharged Notepad. It stores your notes as Markdown files (a plain text format) on your own computer, not on some company's server.

Many knowledge workers use it to manage personal notes, knowledge bases, and writing projects.

---

## How Does This Blog Template Relate to Obsidian?

**Important: This is NOT an Obsidian plugin.**

This blog template simply **supports Obsidian's file format**. What that means:

- The note formats you use in Obsidian (like `[[wikilinks]]` and image references) will display correctly on your blog
- You don't need to install any Obsidian plugins
- You just put your finished files into the blog project's designated folder

> Analogy: Obsidian is your "pen," and this blog template is your "publisher." Whatever format your pen produces, the publisher can read it.

---

## The Workflow (4 Simple Steps)

| Step                   | What you do                                         | What happens                                       |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------- |
| 1. Write               | Write your article in Obsidian                      | File is saved on your computer                     |
| 2. Mark for publishing | Add a few lines of config at the top of the article | Tells the system "publish this one"                |
| 3. Push to GitHub      | Use a tool to "upload" your files                   | Files sync to the cloud                            |
| 4. Auto-publish        | Nothing — just wait                                 | Your site updates automatically, article goes live |

Put publishable notes in `content/notes` by default, or set `OBSIDIAN_NOTES_DIR` if your notes live somewhere else. Each note must opt in to publishing with one of these markers:

```md
---
publish: true
---
```

`published: true` also works, and so does a `#publish` tag in the note.

### About Git and GitHub

- **Git** is a version control tool — think of it as a "time machine for files." It records every change you make, so you can always go back
- **GitHub** is an online platform for storing your project files (like "Google Drive for programmers")

> If Git is completely new to you, ask a technical colleague to do the initial setup. After that, day-to-day operations can be done with GitHub Desktop (a visual app with buttons and menus) — no command line needed.

---

## How Are Images Handled?

Put images in the designated folder in your Obsidian vault. The blog system automatically recognizes Obsidian's image format (`![[image-name.png]]`) and displays them correctly on your site.

---

## How Are Links Handled?

Obsidian's wikilink format `[[Another Note]]` is automatically converted into regular blog links. You don't need to change anything manually.

---

## Who Is This For?

| Good fit                                            | Not ideal for                                    |
| --------------------------------------------------- | ------------------------------------------------ |
| People already using Obsidian for notes             | People who don't want to install software        |
| People who like writing locally and offline         | People who just want to open a browser and write |
| People who want their notes and blog connected      | People who find file management stressful        |
| People with a technical colleague for initial setup | People with no one to help with tech setup       |

> **If this feels too complex**, that's okay! Just use the dashboard writing method instead. See the [Publishing](./publishing) page for details.
