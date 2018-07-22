# Anatomy

- [Accounts](#Accounts)
- [Formatters](#Formatters)
- [Validators](#Validators)
- [Sources](#Sources)

## Accounts
Accounts are modules that interact with a service, like GitHub or Twitter.
The account manager initializes all accounts for the tool as specified in the config.

The manager passes the config object as only parameter to the constructor.

Accounts that are used to post content, extend the `ContentAccount` class.

## Formatters
Formatters specify how the card content should look and can create card content
from its individual data.

They are both used to create the issue templates and to generate new cards in sources.

Publishing services have their own formatters when they offer special fields.

## Validators
Validators check the card content for errors.

Every publishing services should have a validator to verify the card content can be posted with it.

## Sources
Sources are actors on cards in board columns. Some sources operate on a single column,
some sources operate on all columns. Sources can declare columns as fully managed by them in
the `managedColumns` property and other sources should ignore those columns by listing manged sources with `_getManagedColumns`.

Every source can have its own configuration options, like which publishing account to use.
