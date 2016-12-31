# gh-projects-content-queue
[![Build Status](https://travis-ci.org/mozillach/gh-projects-content-queue.svg?branch=master)](https://travis-ci.org/mozillach/gh-projects-content-queue) [![codecov](https://codecov.io/gh/mozillach/gh-projects-content-queue/branch/master/graph/badge.svg)](https://codecov.io/gh/mozillach/gh-projects-content-queue)

A Twitter content curation queue based on GitHub projects.

## Features


## Set up a repo for use with this tool

### Requirements
 - GitHub user auth token
    - Needs the repo:write scope

### Issue template

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
