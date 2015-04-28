
# Contribute to Echidna

This is the contribution reference of Echidna. Great to have you here. Here are a few ways you can help make this project better!

## Talk with us

Talk with us directly on IRC. Here are some [detailed instructions to connect](http://www.w3.org/Project/IRC/). The server is `irc.w3.org` and the corresponding channel is `#pub`. If you do not have an IRC client on hand, you can log into the [W3C Public IRC Web Client](http://irc.w3.org/).

Discuss the publication workflow and related tools [on the mailing list](http://lists.w3.org/Archives/Public/spec-prod/).

## Report a bug or suggest a feature idea

Start by looking through the [existing bugs](https://github.com/w3c/echidna/issues) to see if this was already discussed earlier. You might even find your solution there.

**NB:** as of today, Echidna and Specberus are developed, tested and deployed using [Node.js](http://nodejs.org/) `v0.12.0`
and [npm](https://www.npmjs.org/) `2.5.1`.
When reporting bugs, please make sure you can reproduce them with this recommended setup.
Also, remember to update npm dependencies often.

If you do not find anything, you can help report bugs by [filing them here](https://github.com/w3c/echidna/issues/new). Please use the following template when doing so:

```markdown
##### Issue Type

Can you help us out in labelling this by telling us what kind of ticket this this?
You can say "Bug Report", "Feature Idea" or "Documentation Report".

##### Summary

Please summarize your request in this space. You will earn bonus points for being
succinct, but please add enough detail so we can understand the request. Thanks!

##### Steps To Reproduce

If this is a bug ticket, please enter the steps you use to reproduce the problem
in the space below. If this is a feature request, please enter the steps you would
use to use the feature. If an example document is useful, please include its URL.

##### Expected Results

Please enter your expected results in this space. When running the steps supplied
above in the previous section, what did you expect to happen? If showing example
output, please surround it with 3 backticks before and after so that it's rendered
correctly.

##### Actual Results

Please enter your actual results in this space. When running the steps supplied
above, what actually happened? If showing example output, please surround it with
3 backticks before and after so that it's rendered correctly.
```

## Contribute to the code

First of all, thank you very much for offering your help. This is much appreciated.

Before adding a new feature or submitting a bugfix, please refer to the [existing issues](https://github.com/w3c/echidna/issues) to check if it was already discussed before. If it wasn't, please [create a new one](https://github.com/w3c/echidna/issues/new) so that we can discuss together about it before you start coding. It would be frustrating for everyone if we had to refuse your contribution because we did not share the same opinion!

To make sure we are on the same page, you should refer to our [coding style guide](https://github.com/w3c/echidna/wiki/Coding-style-guide) and [coding practices guide](https://github.com/w3c/echidna/wiki/Coding-practices-guide) before coding.

Finally, we value testing a lot. Before committing anything, make sure the style is respected and the test suite passes by running `npm test`. If you submit a bugfix, try to write tests to reproduce this bug to ensure the same bug will not come up again in the future. And if you submit a new feature, provide tests to ensure the correct behavior of the nominal and edge cases.

A couple of things you should consider before committing and [opening a pull request](https://github.com/w3c/echidna/pulls):

- Regarding your Git commit messages:
  - Use imperative present tense for commit messages as [suggested in the official documentation](http://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project#Commit-Guidelines).
  - When commiting a bug fix, start your line with "Fix #xx", xx being the issue number. For example: `git commit -m 'Fix #42: Answer the Ultimate Question of Life, The Universe, and Everything'`
- To ease the merge of pull requests, make sure your branch is up-to-date with `master` when submitting it. Always use `git rebase` instead of `git merge` and `git pull --rebase` instead of `git pull` to avoid merge commits in your submissions.

## Documentation

Documentation can be found on [the wiki](https://github.com/w3c/echidna/wiki). You can help us improving it by adding missing pieces, clarifying unclear parts, or asking us to do that.

## Code of Conduct

All contributors to this project agree to follow the [W3C Code of Ethics and Professional Conduct](http://www.w3.org/Consortium/cepc/).

If you want to take action, you can contact W3C Staff as explained in [W3C Procedures](http://www.w3.org/Consortium/pwe/#Procedures).

