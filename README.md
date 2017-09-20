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
 - Auto create tweets for events on Mozilla Reps for a given query

### Planned
 - Tweet pinning management
 - Auto create tweets for new discourse threads
 - See all the issues with the enhancement tag...

## Set up a repo for use with this tool

### Requirements
 - GitHub user auth token (will use that to create issues and comment on them etc.)
    - Log in with your GitHub user
    - Go to your settings
    - Go to "Personal access token" and go click on the "Generate new token" button
    - Select the "public_repo" scope and click save
    - Add the resulting token to the `config.json` file (`githubToken` property)
 - Twitter API credentials incl. OAuth tokens and secret (will tweet to this account)
    - Create a new App through [apps.twitter.com](https://apps.twitter.com/)
    - There is no need to define a redirect URL, just leave the field blank
    - Copy the consumer key and secret to the fields in the `config.json` file
    - Click on "Create access token"
    - Copy the access token key and secret to the fields in the `config.json` file
 - Node >= 7.7.1

### Issue template
An issue template is generated in the repository if none is found. See the documentation for GitHub issue templates.

### Configuration
#### By file
The configuration is defined with JSON in the file `config.json` in the root directory of the project. This file does not exist by default. It is validated against the [config schema](templates/config.schema.json). The default config can be found in [`config.default.json`](config.default.json). Note that this is not a working config, as invalid values are provided for the authentication credentials for Twitter and GitHub. You can copy the [`config.default.json`](config.default.json) to `config.json` and edit it.

You could also provide the configuartion via the environment, but if a config.json is present it will be preferred.

#### By environment variables
The `CQ_CONFIG` environment vairable should be set to a stringified version of the JSON configuration.

#### Basic anatomy
The configuration consists of an array of repositories to run the tool on. Each repository has its entirely separate configuration.

#### Required properties
##### githubToken
Token to the GitHub account the service should run as.

##### repo
Repository the tool should run on. Should be of the form of "username/repository".

##### twitter
Object with four properties:
 - `consumer_key`: Twitter API consumer key as string
 - `consumer_secret`: Twitter API consumer secret as string
 - `access_token_key`: Twitter API access token (you may have to generate this)
 - `access_token_secret`: Twitter API access token secret (you may have to generate this)

##### projectName
Name of the GitHub project board to run the tool in.

#### Additional properties

##### sources
Sources to run on the board. You need to declare these, else none are loaded. The sources are a key on an object, where their value currently is just an empty object, but will eventually hold source configuration.

There are currently three stable sources:
 - **issues**: Adds open issues to an ideas column.
 - **mentions**: Opens issues for new mentions on Twitter.
 - **tweeting**: Tweets valid issues from the To tweet column and moves them to tweeted and closes them.
 - **squad**: Assigns users from a list to new issues in a column.
 - **events**: Opens new issues for new events on reps.mozilla.org with a specific query.
 - **reminder**: Reminds assignees and people following an issue when it's due but not ready.

###### columns
Specifies the column names of columns the source should use. Is a key-value map with the key being a column identifier from the source and the value the name of the column.

###### squad
List for users that should handle new mentions for the **squad** source. The array should hold usernames of all users to cycle through.

###### schedule
A schedule of slots for the tweeting source. Takes a time in the format of `hh:mm`. The field is fully optional. If not provided tweets are instantly sent out unless scheduled. This does not use the timezone of the schedulingTime but UTC.

###### query
The search query for the **events** source.

##### labels
Adjust the names of the labels the tool uses. Built in label identifiers:
 - `retweet`
 - `ready`
 - `invalid`

##### schedulingTime
Define the local time zone and the date format for scheduling Tweets. An object with two properties.

###### format
Date format for scheduling tweets.

**Placeholders**:
 - `YYYY`: Four digit representation of the year
 - `MM`: Two digit representation of the month
 - `DD`: Two digit representation of the day of the month
 - `HH`: Two digit 24 hours representation of the hour
 - `mm`: Two digit representation of the minute in the hour

**Dividers**:
 - `.`
 - `:`
 - ` `
 - `T`
 - `Z`
 - `-`

###### timezone
Integer offset from UTC of the machine the tool is running on.

#### Example
See [config.default.json](./config.default.json)

### Run
#### The tool
The tool can be executed with `npm start`. Note that you should first run `npm install`.

#### The docker container
[Official Docker container](https://hub.docker.com/r/mozillach/content-queue)

The latest tag corresponds to the master branch in this repository. Note that the docker container can only be configured via env. The `--init` parameter should be set when running with Docker 1.13 and later.

#### The tests
The testsuite can be ran with the default `npm test`. It includes linting of the code using eslint and unit tests with ava. Tests require no prior config other than runnimg `npm install` and that all files from this repo be present.
