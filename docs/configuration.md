# Configuration

- [By file](#by-file)
- [By environment variables](#by-environment-variables)
- [Basic anatomy](#basic-anatomy)

## By file
The configuration is defined with JSON in the file `config.json` in the root directory of the project. This file does not exist by default. It is validated against the [config schema](templates/config.schema.json). The default config can be found in [`config.default.json`](config.default.json). Note that this is not a working config, as invalid values are provided for the authentication credentials for Twitter and GitHub. You can copy the [`config.default.json`](config.default.json) to `config.json` and edit it.

You could also provide the configuartion via the environment, but if a config.json is present it will be preferred.

## By environment variables
The `CQ_CONFIG` environment vairable should be set to a stringified version of the JSON configuration.

## Basic anatomy
The configuration consists of an array of boards to run the tool on and a dictionary of accounts for usage with the boards.

## Required properties
### githubToken
Token to the GitHub account the service should run as.

### repo
Repository the tool should run on. Should be of the form of "username/repository".

### twitter
Object with four properties:
- `consumer_key`: Twitter API consumer key as string
- `consumer_secret`: Twitter API consumer secret as string
- `access_token_key`: Twitter API access token (you may have to generate this)
- `access_token_secret`: Twitter API access token secret (you may have to generate this)

### projectName
Name of the GitHub project board to run the tool in.

## Additional properties

### sources
Sources to run on the board. You need to declare these, else none are loaded. The sources are in an array of objects, where each object defines the source and its parameters. This means you can have multiple instances of one sources, though the same source should never run multiple times on the same column. The tool currently doesn't check that.

There are currently seven stable sources:
- **issues**: Adds open issues to an ideas column.
- **mentions**: Opens issues for new mentions on Twitter.
- **tweeting**: Tweets valid issues from the To tweet column and moves them to tweeted and closes them.
- **squad**: Assigns users from a list to new issues in a column.
- **events**: Opens new issues for new events on reps.mozilla.org with a specific query.
- **reminder**: Reminds assignees and people following an issue when it's due but not ready.
- **discourse**: Opens an issue for each new discourse thread in a given discourse category.

#### type
A string describing the type of the source. Should be one of the available source names.

#### columns
Specifies the column names of columns the source should use. Is a key-value map with the key being a column identifier from the source and the value the name of the column.

#### squad
List for users that should handle new mentions for the **squad** source. The array should hold usernames of all users to cycle through. Is preferred over the `squadTeam` config.

#### squadTeam
Name of an organization team that should be the source to the reaction squad for the **squad** source. Should be the name of the team.

#### schedule
A schedule of slots for the **tweeting** source. Per slot one tweet is sent out, including scheduled tweets. Takes an array of strings, containing the desired time in the format of `hh:mm`. The field is fully optional. If not provided tweets are instantly sent out unless scheduled. This does not use the timezone of the `schedulingTime` and is in UTC+0.

#### discourse properties
The **discourse** source requires four configuration keys:
- `forum`: Slug of the category to watch threads of.
- `apiUrl`: URL of the API of the discourse instance.
- `apiKey`: API Key for the discourse instance.
- `username`: Username for the discourse instance.

#### query
The search query for the **events** source.

### labels
Adjust the names of the labels the tool uses. Built in label identifiers:
- `retweet`
- `ready`
- `invalid`

### schedulingTime
Define the local time zone and the date format for scheduling Tweets. An object with two properties.

#### format
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

#### timezone
Integer offset from UTC the tool should treat dates in issues as.

## Example
See [config.default.json](./config.default.json)
