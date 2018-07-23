# gh-projects-content-queue

[![Greenkeeper badge](https://badges.greenkeeper.io/mozillach/gh-projects-content-queue.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/mozillach/gh-projects-content-queue.svg?branch=master)](https://travis-ci.org/mozillach/gh-projects-content-queue) [![codecov](https://codecov.io/gh/mozillach/gh-projects-content-queue/branch/master/graph/badge.svg)](https://codecov.io/gh/mozillach/gh-projects-content-queue) [![docker hub](https://img.shields.io/docker/build/mozillach/content-queue.svg)](https://hub.docker.com/r/mozillach/content-queue/builds)

A Twitter content curation queue based on GitHub projects. Crowd sources tweet
creation, improves collaboration and gives better control over content quality.

## Features

- Represent tweets as GitHub issues
    - Supports replying and retweets
- Auto add issues to a column in a dedicated project board
- Auto tweet issues from a column in the dedicated board
- Validate issue content to be valid for tweeting
- Scheduling of tweets to an exact time
- Reaction squad system to ping people to react to a mention
- Auto tweeting tweets from a column in certain spacing (à la buffer)
- Reminder system for tweets that are due but not ready
- Auto create tweets for events from an ical feed
- Auto create tweets for new discourse threads
- Auto create tweets for posts in an Atom or RSS feed

### Planned
- Tweet pinning management
- See all the issues with the enhancement tag...

## Set up a repo for use with this tool

### Requirements
- GitHub user auth token (will use that to create issues and comment on them etc.)
    - Log in with your GitHub user
    - Go to your settings
    - Go to "Personal access token" and go click on the "Generate new token" button
    - Select the "public_repo" scope and if you are using it with an organization "read:org" and click save
    - Add the resulting token to the `config.json` file (`githubToken` property)
- Twitter API credentials incl. OAuth tokens and secret (will tweet to this account)
    - Create a new App through [apps.twitter.com](https://apps.twitter.com/)
    - There is no need to define a redirect URL, just leave the field blank
    - Copy the consumer key and secret to the fields in the `config.json` file
    - Click on "Create access token"
    - Copy the access token key and secret to the fields in the `config.json` file
- Node >= 8.0.0

### Issue template
An issue template is generated in the repository if none is found. See the documentation for GitHub issue templates.

### Configuration
[configuration.md](docs/configuration.md)

### Run
#### The tool
The tool can be executed with `npm start`. Note that you should first run `npm install`.

#### The docker container
Official Docker container: [`mozillach/content-queue`](https://hub.docker.com/r/mozillach/content-queue)

The latest tag corresponds to the master branch in this repository. Note that the docker container can only be configured via environment.

#### The tests
The test suite can be ran with the default `npm test`. It includes linting of the code using eslint and unit tests with ava. Tests require no prior configuration other than running `npm install` and that all files from this repository be present.
