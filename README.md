# Carousel Lite

### A free Claude Code skill by [@tenfoldmarc](https://www.instagram.com/tenfoldmarc)

Turn any topic into a finished Instagram carousel. Real copy, real slides, rendered as AirDrop-ready PNGs. One clean built-in style, zero design work, zero setup beyond one install.

This is the **free** version. The full `/carousel` (multiple styles, AI-generated cover images, viral hook intelligence, topic brainstorming, and custom brand kits) is part of the Go Viral System inside [AI Builders](https://skool.com/ten-fold).

---

## What it does

1. You give it a topic.
2. It writes the slide copy (hook, content slides, call to action) and shows you for approval.
3. It renders every slide as a 1080x1440 PNG.
4. It opens the folder so you can AirDrop them to your phone and post.

---

## What you need

- A Mac or Linux computer
- [Claude Code](https://claude.com/claude-code) installed
- [Node.js](https://nodejs.org) 18 or newer

That's it. No accounts, no API keys.

---

## Install

```bash
git clone https://github.com/tenfoldmarc/carousel-lite ~/.claude/skills/carousel-lite
cd ~/.claude/skills/carousel-lite
npm install
```

Or just tell Claude Code: *"install this skill for me: https://github.com/tenfoldmarc/carousel-lite"*

---

## Use it

In Claude Code:

```
/carousel-lite 5 AI tools every beginner needs
```

Approve the copy, and it renders the slides into `./out`.

---

## Manual render (without Claude)

Edit `slides.json` (copy `slides.example.json` to start), then:

```bash
node build.js
```

PNGs land in `./out`.

---

## Get the Go Viral System

The complete `/carousel` adds multiple styles, AI cover images, proven viral hook templates, topic brainstorming, and your own brand kit. Get the Go Viral System inside AI Builders: [skool.com/ten-fold](https://skool.com/ten-fold)

Built by [@tenfoldmarc](https://www.instagram.com/tenfoldmarc).
