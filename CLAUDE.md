# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Offpage** is a desktop application that generates websites using AI, running locally on the user's device (no external API calls). Available for Windows and macOS, with a marketing/download website.

## Architecture

This is a new project — architecture decisions are still being made. Key constraints:

- Cross-platform desktop app (Windows + macOS)
- AI inference runs locally on-device
- Companion marketing website for downloads

## Approach

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.
