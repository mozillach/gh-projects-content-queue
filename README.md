# gh-projects-content-queue

[![Greenkeeper badge](https://badges.greenkeeper.io/mozillach/gh-projects-content-queue.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/mozillach/gh-projects-content-queue.svg?branch=master)](https://travis-ci.org/mozillach/gh-projects-content-queue) [![codecov](https://codecov.io/gh/mozillach/gh-projects-content-queue/branch/master/graph/badge.svg)](https://codecov.io/gh/mozillach/gh-projects-content-queue) [![docker hub](https://img.shields.io/docker/build/mozillach/content-queue.svg)](https://hub.docker.com/r/mozillach/content-queue/builds)

A content curation queue based on GitHub projects. Originally built for tweeting. Crowd sources content
creation, improves collaboration and gives better control over content quality.

## Features

- Represent tweets as GitHub issues
    - Supports replying and retweets
    - Auto add unhandled mentions as new issues
- Auto add issues to a column in a dedicated project board
- Auto post issues from a column in the dedicated board
- Validate issue content to be valid for posting
- Scheduling of posts to an exact time
- Reaction squad system to ping people to react to a mention
- Auto posting from a column in certain spacing (à la buffer)
- Reminder system for posts that are due but not ready
- Auto create posts for events from an ical feed
- Auto create posts for new discourse threads
- Auto create posts for posts in an Atom or RSS feed
- Mastodon support
    - Supports replying, reposts and spoilers

### Planned

- Tweet pinning management (will probably happen for Mastodon first, since there's actually an API for that there)
- See all the issues with the enhancement tag...

## Set up a repo for use with this tool

### Requirements

- GitHub user auth token (will use that to create issues and comment on them etc.)
    - Log in with your GitHub user
    - Go to your settings
    - Go to "Personal access token" and go click on the "Generate new token" button
    - Select the "public_repo" scope and if you are using it with an organization "read:org" and click save
    - Add the resulting token to the `config.json` file (`accounts.github.token` property)
- Twitter API credentials incl. OAuth tokens and secret (will tweet to this account)
    - Create a new App through [developer.twitter.com/apps](https://developer.twitter.com/apps)
    - Apply for a developer account if you don't have one yet
    - There is no need to define a redirect URL, just leave the field blank
    - Copy the consumer key and secret to the fields in the `config.json` file
    - Click on "Create access token"
    - Copy the access token key and secret to the fields in the `config.json` file
- Mastodon OAuth access token (will toot to this account)
    - In the following, replace `https://mastodoninstance.example.com` with the URL of your instance
    - Create a new application at `https://mastodoninstance.example.com/settings/applications/new`
    - Grant all read and write scopes. In theory the `read:accounts`, `read:statuses` and `write:statuses` should be enough at the moment, but this is untested
    - Go to the application and copy the access token under "Your access token"
    - The instance URL is probably `https://mastodoninstance.example.com/api/v1`
    - Add both the access token and the instance URL to the fields in the `config.json` file
- Node >= 8.0.0

### Issue template
Issue templates are generated in the repository. See the documentation for GitHub issue templates.

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
