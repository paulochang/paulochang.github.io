---
title: The Blog Setup
date: 2026-11-23T17:13:00+01:00
description: Describes the current blog setup, the architecture behind it and how it came to be. It also describes the rules and expectations for future readers.
draft: false
slug: the-blog-setup
---
## The Why
I think that by now, creating a blog is almost a meme within the developer community. You start thinking about your career, what you have done and suddenly, the urge to create a blog materializes. It's the midlife crisis equivalent in the senior development career. In any case, here I am doing what I finally set out to do after about a year. 

So, first, let's clarify what you can expect from *my* blog. 

My goal is to have a space where I can share the learnings I get while doing my daily job, which, at least for now, involves a healthy mixture of actual software development and a good amount of researching and publicizing the latest trends of AI-driven development in my company. I will also be posting occasionally about random interests of mine. I will try to keep all posts tagged as well as possible so you can all filter and get exactly what you are interested in. Also, I'm a big fan of approachability and would therefore like my posts to read in the same voice I use in a typical conversation.

Having established that, I thought that the easiest way to start was to fulfill, once again, the meme requirements by creating a post about the blog setup itself. It's something that I know and have fresh in my mind so it seemed like a good starting point.
## Deciding on the technical approach
So the first thing I had to establish to set up my blog were ... the constraints of the project. Here you will find a randomly-ordered list of some of them:
- I wanted my blog to be hosted on a `/blog` directory from my existing website. I figured that would be the expected place to find it. 
- I wanted to be able to easily edit it even if I had nothing but a random stranger's phone at hand. 
- I didn't want to track anything using invasive and heavy analytics scripts. I am happy with getting some very basic data from the kind of clients and geographies of my visitors so the information I already had in my server logs was enough.
- I also wanted to have full control of the rendered HTML (or whatever format) that I would serve my visitors.
- Finally, I liked the idea of using markdown files as it seems to be the lingua franca for anything programming nowadays (thanks LLMs).

I took a look at various hosted platforms like Ghost, Substack, Medium, etc., but honestly, they all felt either too restrictive or way too much functionality for what I needed. There were also some options that seemed cool... but way too complicated to set up (hello [Emdash](https://github.com/emdash-cms/emdash)). 

So after taking a quick look and deciding that I'm a great fan of ~~reinventing the wheel~~ ahem... *experimenting*, I decided to go with something I was already familiar with. Good ol' markdown files, a git repository and some light processing scripts. Markdown was AFAICT powerful enough to do some basic formatting without getting in the way (see [the OG Markdown post](https://daringfireball.net/projects/markdown/syntax#philosophy)). Git allowed me to have some sort of version control. And the markdown to html pipeline is so beautifully proven by now that I didn't need to care about whether or not it would work.

At some point I even toyed with the idea of creating my own iOS/macOS app for editing and publishing but since I was already using "standard" formats and tools... I figured I could just keep filling the gaps with already existing tools for it too... Aaaand I was right, [Obsidian](https://obsidian.md/) already gives me much more than I need in terms of editing, there are clients in all the major platforms... and setting up my blog as a vault meant I could also use some existing niceties like templates, properties, backlinks, etc. 

## How it all works
The setup in a few words starts with an Obsidian vault that is copied to [my website repository](https://github.com/paulochang/paulochang.github.io) and after a commit is pushed, Cloudflare Pages builds the blog as various HTML files with [Eleventy](https://www.11ty.dev/).

The whole idea is to allow me to write a post on my phone or my Mac the same way I would edit or create a markdown document with whatever markdown editor I want. If I have access to my iCloud and Obsidian, I would just open my vault and create a post following a template and run a small script to sync it with my repository. If I'm in a wildly complicated situation, I can log in to GitHub and create or edit a .md file with the built-in web editor on the repository itself. Committing the changes and pushing to the *master* branch would then trigger Cloudflare Pages to generate the necessary HTML files with Eleventy, including the index, tags, etc. 

Eleventy was what I decided on based on the absolute simplicity of being able to run a static site generator as a simple script from Cloudflare Pages. I could have used a bunch more and really the only reason was that it was the first one I found and it worked on the first try. That's it... if you have some personal issues with 11ty, feel free to use whatever your heart desires.

The rest of my site is plain HTML files at the repo root. Why? Because they already work and I don't expect the rest of my site to be structured in a way that requires me to generate content following a specific template other than the blog.
## Writing on the go
I can imagine some people confused about the whole iCloud-to-git repo sync and I understand why a lot of you wouldn't go with this setup. I went with it because I'm already in the Apple ecosystem and don't really expect it to change anytime soon. I have a MacBook, an iPhone and an iCloud subscription so for now I'll be using that to move easily between the phone and the computer. However, that might change at some point soon... or maybe it won't, who knows.

There is one thing that I would like to clarify tho and that is why I decided to keep the vault and git clone repository separate. I have had some issues with git repositories in the past. Specifically, I have had issues dealing with the sync of the `.git` folder in iCloud. So to keep those as far away as possible, I decided to have a small script syncing those on demand instead. Also, the Obsidian Git plugin seems... unstable to say the least so I didn't want to trust that one either. 
## Rules I have carried from the website
I have decided to make my life difficult by having a no-JS rule. Why? Well, because it turns out [CSS can do a whole bunch of stuff](https://lyra.horse/blog/2025/08/you-dont-need-js/) nowadays. Having a no-JS rule forces me to figure out what CSS can do (and understand what it cannot do). It also makes my site a delight to use for everyone requiring top accessibility compliance. Finally, it makes it absurdly fast to load :)

Additionally, I have decided to make a publicly accessible version of each post as a markdown you can request/download (e.g. [my welcome post](https://paulochang.com/blog/welcome/index.md)) and the whole site has an up to date [llms.txt](https://paulochang.com/llms.txt) you (or any agent) can consult. This makes it very "agent-friendly", which I can imagine will be very relevant very soon. 

Finally, if you use a feed reader, you can use the [Atom feed](https://paulochang.com/blog/feed.xml) to keep up to date.
## The (AI) elephant in the room
Nothing (or [close to nothing](https://www.reddit.com/r/opensource/comments/1xelcuf/your_tokens_arent_valuable_no_more_ai/)) these days gets done without some sort of help from an LLM. And this blog was no exception. 

For this blog, I had Claude help me research quite a few options to set up and maintain my blog platform. It helped me evaluate the pros and cons of each option and discover what was important for me too. Sometimes I didn't know about certain constraints until some features were mentioned (or not) in the research results. I will be talking about how the research workflow works in an upcoming post.

Once I had chosen the tools I'd use, I had Claude create a plan on how the blog setup would be implemented. After a few sessions of back and forth, it was ready. I then made Claude build the 11ty setup and the sync scripts. The Obsidian vault templates and setup were also done by Claude.

And... that's it. I figured I didn't want to give my visitors some AI slop content so I gave myself the rule of never ever letting AI write a single word of these posts and I intend to keep it that way for the time being. As of now, I think the general feeling is that AI writing falls in a sort of uncanny valley that triggers my (and, it seems, others') automatic repulsion. So until this is sorted, every word in this blog will be typed by me. I'll let it write code, and occasionally I'll probably copy some code excerpts written by AI but you can be certain I will respect your time and mark any AI content distinctively.
## In progress
As of today, the blog still doesn't have working tags or search, but I'm planning on adding this functionality soon.

If you liked this post and/or would like to keep updated, consider following the Atom feed. If you have any comments or would like to contact me for any reason, feel free to shoot me an email at hello `[at]` paulochang `[dot]` com.