---
title: API
description: What your website's API can do, and who uses it.
---

## What Is an API

Think of a **restaurant service window**: you tell the waiter what you want, and they go to the kitchen to prepare it for you. You never need to enter the kitchen yourself.

An API is your website's "service window" for other programs. Through this window, tools and scripts can send commands to your site — like "publish this article" or "export all my content."

## What Can Your Website's API Do

| Capability                   | Example                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Publish and manage posts** | Let an AI tool automatically publish articles to your site after writing them |
| **Bulk import content**      | Move all your old articles from another platform in one go                    |
| **Export and backup**        | Download all your content as a package to prevent data loss                   |
| **Manage comments**          | Approve or delete spam comments in bulk                                       |
| **Manage media assets**      | Upload and browse images used on your site                                    |

## Who Uses the API

Most of the time, you won't need to use the API directly. These are the typical users:

- **A developer helping you automate things** — for example, setting up automatic daily backups
- **AI writing tools** — publishing finished articles to your site without you copying and pasting
- **Other platforms and integrations** — syncing your content to other places

## Security: API Tokens

An API Token is like a **key**. Only programs that have this key can operate your website through the API.

You can create tokens in the admin settings page and give each key different permissions — some can only read posts, others can publish, others can moderate comments. That way, even if one key is leaked, the damage is limited.

> **Tip:** Just like you wouldn't hand out a master key to your house, each token should only have the minimum permissions it needs.

## What Is OpenAPI

Your website provides a **standardized instruction manual** at `/openapi.json`.

This document describes all of your API's capabilities in a format that any program can understand. When a developer or AI tool reads this file, they automatically know how to talk to your website — no need to look up each endpoint manually.

> You don't need to open or read this file yourself — it's meant for programs to read.
