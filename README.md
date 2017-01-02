# gh-projects-content-queue
[![Build Status](https://travis-ci.org/mozillach/gh-projects-content-queue.svg?branch=master)](https://travis-ci.org/mozillach/gh-projects-content-queue) [![codecov](https://codecov.io/gh/mozillach/gh-projects-content-queue/branch/master/graph/badge.svg)](https://codecov.io/gh/mozillach/gh-projects-content-queue)

A Twitter content curation queue based on GitHub projects.

## Features


## Set up a repo for use with this tool

### Requirements
 - GitHub user auth token
    - Needs the repo:write scope
 - Twitter API credentials incl. OAuth tokens and secret
 - Node >= 7

### Issue template
An issue template is generated in the repository if none is found.

### Configuration

#### Example
```json
[
    {
        "githubToken": "",
        "repo": "mozillach/twitter",
        "projectName": "Tweets",
        "columns": {
            "ideas": "Ideas",
            "reactions": "Need Reaction",
            "events": "Events",
            "toTweet": "Ready for Twitter",
            "tweeted": "Tweeted"
        },
        "labels": {
            "retweet": "Retweet",
            "ready": "ready",
            "invalid": "invalid"
        },
        "schedulingTime": {
            "format": "DD.MM.YYYY HH:mm",
            "zone": 1
        },
        "twitter": {
            "user": "mozillach",
            "consumer_key": "",
            "consumer_secret": "",
            "access_token_key": "",
            "access_token_secret": ""
        }
    }
]
```

### Run the tool
The tool can be executed with `npm start`. Note that you should first run `npm install`.
