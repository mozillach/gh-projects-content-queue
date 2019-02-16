# Configuration

- [By file](#by-file)
- [By environment variables](#by-environment-variables)
- [Basic anatomy](#basic-anatomy)

## By file

The configuration is defined with JSON in the file `config.json` in the root directory of the project. This file does not exist by default. It is validated against the [config schema](templates/config.schema.json). The default config can be found in [`config.default.json`](config.default.json). Note that this is not a working config, as invalid values are provided for the authentication credentials for Twitter and GitHub. You can copy the [`config.default.json`](config.default.json) to `config.json` and edit it.

You could also provide the configuartion via the environment, but if a config.json is present it will be preferred.

## By environment variables

The `CQ_CONFIG` environment variable should be set to a stringified version of the JSON configuration.

## Basic anatomy

The configuration consists of account credentials for external services and boards that the tool should run on. Both the `accounts` and the `boards` key are required.

### `accounts`

Each key is an array of accounts. Accounts must at least have a `name` key. Names are unique per account type. This can be an empty object, though that would be a rather weird configuration.

#### `github`

##### `token`

Token to the GitHub account the service should run as. Required key.

#### `twitter`

##### `consumer_key`

Twitter API consumer key as string

##### `consumer_secret`

Twitter API consumer secret as string

##### `access_token_key`

Twitter API access token (you may have to generate this)

##### `access_token_secret`

Twitter API access token secret (you may have to generate this)

#### `discourse`

##### `url`

URL of the API of the discourse instance.

##### `key`

API Key for the discourse instance.

##### `username`

Username for the discourse instance.

##### `forum`

Slug of the category to watch threads of.

#### `mastodon`

##### `accessToken`

Mastodon API access token for the user that should toot (you may have to generate this).

##### url

API base URL of the instance to toot on.

### `boards`

### repo

Repository the tool should run on. Should be of the form of "username/repository". Required.

### githubAccount

Name of the GitHub account to use. Required.

### projectName

Name of the GitHub project board to run the tool in. Required.

### sources

Sources to run on the board. You need to declare these, else none are loaded. The sources are in an array of objects, where each object defines the source and its parameters. This means you can have multiple instances of one sources, though the same source should never run multiple times on the same column. The tool currently doesn't check that.

There are currently seven stable sources:

- **discourse**: Opens an issue for each new discourse thread in a given discourse account.
- **events**: Opens new issues for new events in an iCal calendar.
- **feed**: Opens new issues for new RSS or Atom feed items.
- **issues**: Adds open issues to a column and removes closed issues in non-managed columns.
- **mentions**: Opens issues for new mentions on Twitter.
- **publish**: Publishes valid issues from the source column and moves them to the target column and closes them.
- **reminder**: Reminds assignees and people following an issue when it's due but not ready.
- **squad**: Assigns users from a list to new issues in a column.
- **valdiator**: Validates the issue contents for a given service.

#### type

A string describing the type of the source. Should be one of the available source names.

#### columns

Specifies the column names of columns the source should use. Is a key-value map with the key being a column identifier from the source and the value the name of the column.

#### squad

List for users that should handle new mentions for the **squad** source. The array should hold usernames of all users to cycle through. Is preferred over the `squadTeam` config.

#### squadTeam

Name of an organization team that should be the source to the reaction squad for the **squad** source. Should be the name of the team.

#### schedule

A schedule of slots for the **publish** source. Per slot one tweet is sent out, including scheduled tweets. Takes an array of strings, containing the desired time in the format of `hh:mm`. The field is fully optional. If not provided tweets are instantly sent out unless scheduled. This does not use the timezone of the `schedulingTime` and is in UTC+0.

#### url

The URL to watch for the **events** and **feed** sources.

#### validator

Validator to use in the **validator** source. Available validators:

- `twitter`
- `validator`
- `mastodon`

#### accountType

Type of the account for the source.

Can be one of these for the **publish** source:

- `twitter`
- `mastodon`

#### accountName

Used to specify the account in many sources:

- **discourse**
- **mentions**
- **publish**

### labels

Adjust the names of the labels the tool uses. Built in label identifiers:

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

Integer offset from UTC the tool should treat dates in issues as. `region` is recommended for localized times.

#### region

String to descripte the region the tool should treat dates in issues as being in. For example "Europe/Zurich" will use Swiss local time. This replaces `timezone`.

## Example

See [config.default.json](./config.default.json)
