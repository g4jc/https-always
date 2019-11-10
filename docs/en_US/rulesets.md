## HTTPS Always Rulesets

This page describes how to write rulesets for HTTPS Always, a browser extension that
switches sites over from HTTP to HTTPS automatically. HTTPS Always comes with thousands
of rulesets that tell HTTPS Always which sites it should switch to HTTPS and how.
If there is a site that offers HTTPS and is not handled by the extension, this guide
will explain how to add that site.

Note: You may also consider using the companion addon [HTTPS Inquirer](https://github.com/g4jc/httpsinquirer) to generate rulesets automatically.

#### [Rulesets](#rulesets)

A `ruleset` is an [XML](https://www.xml.com/pub/a/98/10/guide0.html?page=2) file
describing behavior for a site or group of sites. A ruleset contains one or
more `rules`. For example, here is
[`RabbitMQ.xml`](https://github.com/g4jc/https-always/blob/master/src/chrome/content/rules/RabbitMQ.xml),
from the addon distribution:

```xml
<ruleset name="RabbitMQ">
	<target host="rabbitmq.com" />
	<target host="www.rabbitmq.com" />

	<rule from="^http:"
		to="https:" />
</ruleset>
```

The `target` tag specifies which web sites the ruleset applies to. The `rule`
tag specifies how URLs on those web sites should be rewritten. This rule says
that any URLs on `rabbitmq.com` and `www.rabbitmq.com` should be modified by
replacing "http:" with "https:".

When the browser loads a URL, HTTPS Always takes the host name (e.g.
<tt>www.rabbitmq.com</tt>) and searches its ruleset database for rulesets that
match that host name.

HTTPS Always then tries each rule in those rulesets against the full URL.
If the [Regular
Expression](https://www.regular-expressions.info/quickstart.html), or regexp, in
one of those rules matches, HTTPS Always [rewrites the
URL](#rules-and-regular-expressions) according the `to` attribute of the rule.

#### [Wildcard Targets](#wildcard-targets)

To cover all of a domain's subdomains, you may want to specify a wildcard
target like `*.twitter.com`. Specifying this type of left-side wildcard matches
any host name with `.twitter.com` as a suffix, e.g. `www.twitter.com` or
`urls.api.twitter.com`. You can also specify a right-side wildcard like
`www.google.*`. Right-side wildcards, unlike left-side wildcards, apply only
one level deep. So if you want to cover all countries you'll generally need to
specify `www.google.*`, `www.google.co.*`, and `www.google.com.*` to cover
domains like `www.google.co.uk` or `www.google.com.au`. You should use wildcard
targets only when you have rules that apply to the entire wildcard space. If
your rules only apply to specific hosts, you should list each host as a
separate target.

#### [Rules and Regular Expressions](#rules-and-regular-expressions)

The `rule` tags do the actual rewriting work. The `from` attribute of each rule
is a [regular expression](https://www.regular-expressions.info/quickstart.html)
matched against a full URL. You can use rules to rewrite URLs in simple or
complicated ways. Here's a simplified (and now obsolete) example for Wikipedia:

```xml
<ruleset name="Wikipedia">
	<target host="*.wikipedia.org" />

	<rule from="^http://(\w{2})\.wikipedia\.org/wiki/"
		to="https://secure.wikimedia.org/wikipedia/$1/wiki/"/>
</ruleset>
```

The `to` attribute replaces the text matched by the `from` attribute. It can
contain placeholders like `$1` that are replaced with the text matched inside
the parentheses.

This rule rewrites a URL like `http://fr.wikipedia.org/wiki/Chose` to
`https://secure.wikimedia.org/wikipedia/fr/wiki/Chose`. Notice, again, that the
target is allowed to contain (just one) * as a wildcard meaning "any".

Rules are applied in the order they are listed within each ruleset. Order
between rulesets is unspecified. Only the first rule or exception matching a
given URL is applied.

Rules are evaluated using [Javascript regular
expressions](https://www.regular-expressions.info/javascript.html), which are
similar but not identical to [Perl-style regular
expressions.](https://www.regular-expressions.info/pcre.html) Note that if your
rules include ampersands (&amp;), they need to be appropriately XML-encoded:
replace each occurrence of **&amp;** with **&amp;#x26;**.

#### [Exclusions](#exclusions)

An exclusion specifies a pattern, using a regular expression, for URLs where
the rule should **not** be applied. The Stack Exchange rule contains an
exclusion for the OpenID login path, which breaks logins if it is rewritten:

```xml
<exclusion pattern="^http://(\w+\.)?stack(exchange|overflow)\.com/users/authenticate/" />
```

Exclusions are always evaluated before rules in a given ruleset. Matching any
exclusion means that a URL won't match any rules within the same ruleset.
However, if other rulesets match the same target hosts, the rules in those
rulesets will still be tried.

#### [Style Guide](#style-guide)

There are many different ways you can write a ruleset, or regular expression
within the ruleset. It's easier for everyone to understand the rulesets if they
follow similar practices. You should read and follow the Ruleset style
guide.

#### [Secure Cookies](#secure-cookies)

Many HTTPS websites fail to correctly set the [secure
flag](https://en.wikipedia.org/wiki/HTTP_cookie#Secure_and_HttpOnly)
on authentication and/or tracking cookies. HTTPS Always provides a facility
for turning this flag on. For instance:

```xml
<securecookie host="^market\.android\.com$" name=".+" />
```

The "host" parameter is a regexp specifying which domains should have their
cookies secured; the "name" parameter is a regexp specifying which cookies
should be secured. For a cookie to be secured, it must be sent by a target host
for that ruleset. It must also be sent over HTTPS and match the name regexp.
For cookies set by Javascript in a web page, the UXP extension can't tell
which host set the cookie and instead uses the domain attribute of the cookie
to check against target hosts. A cookie whose domain attribute starts with a
"." (the default, if not specified by Javascript) will be matched as if it was
sent from a host name made by stripping the leading dot.

#### [Testing](#testing)

We use an [automated
checker](https://github.com/hiviah/https-everywhere-checker) to run some basic
tests on all rulesets. This is described in more detail in our [Ruleset
Testing](https://github.com/g4jc/https-always/blob/master/ruleset-testing.md)
document, but in short there are two parts: Your ruleset must have enough test
URLs to cover all the various types of URL covered by your rules. And each of
those test URLs must load, both before rewriting and after rewriting. Every
target host tag generates an implicit test URL unless it contains a wildcard.
You can add additional test URLs manually using the `<test url="..."/>` tag.
The test URLs you add this way should be real pages loaded from the site, or
real images, CSS, and Javascript if you have rules that specifically affect
those resources.

You can test rulesets in the browser using a hidden debugging page, but please
be aware that this approach should only be used for debugging purposes and
should not be used for setting up personal custom rules. You can access the
hidden debugging page this way:

*   Pale Moon: `about:addons` > HTTPS Always preferences > click under
    `General Settings` > press <kbd>Ctrl-Z</kbd>
*   Chromium/Chrome: `chrome://extensions/` > HTTPS Always options > click
    under `General Settings` > press <kbd>Ctrl-Z</kbd>

You might need to disable popup blocking for the page to appear. Once you have
loaded the page, you might find it convenient to bookmark it for later use.

If you&apos;ve tested your rule and are sure it would be of use to the world at
large, submit it as a [pull
request](https://help.github.com/articles/using-pull-requests/) on our [GitHub
repository](https://github.com/g4jc/https-always/).

#### [make-trivial-rule](#make-trivial-rule)

As an alternative to writing rules by hand, there are scripts you can run from
a Unix command line to automate the process of creating a simple rule for a
specified domain.

#### [Disabling a ruleset by default](#disabling-a-ruleset-by-default)

Sometimes rulesets are useful or interesting, but cause problems that make them
unsuitable for being enabled by default in everyone's browsers. Typically when
a ruleset has problems we will disable it by default until someone has time to
fix it. You can do this by adding a `default_off` attribute to the ruleset
element, with a value explaining why the rule is off.

```xml
<ruleset name="Amazon (buggy)" default_off="breaks site">
	<target host="www.amazon.*" />
	<target host="amazon.*" />
</ruleset> 
```

You can add more details, like a link to a bug report, in the comments for the
file.

#### [Mixed Content Blocking (MCB)](#mixed-content-blocking-mcb)

Some rulesets may trigger active mixed content (i.e. scripts loaded over HTTP
instead of HTTPS). This type of mixed content is blocked in most major browsers,
before HTTPS Always has a chance to rewrite the URLs to an HTTPS version.
This generally breaks the site. Depending on their configuration and threat
model, some users might however decide to enable these rulesets via a global
option in HTTPS Always. To that effect, such rulesets are identified with 
the specific `platform="mixedcontent"` attribute to the ruleset element.

#### [Saving the Ruleset](#saving-the-ruleset)

Once you have created your ruleset it needs to be placed into the application profile directory under the `HTTPSAlwaysRulesets` folder.

e.g. On Windows:

`C:\Users\[your_username]\AppData\Roaming\Moonchild Productions\Pale Moon\Profiles\[your_profile].default\HTTPSAlwaysUserRules`

On GNU/Linux:
`/home/user/.moonchild productions/pale moon/[your_profile].default/HTTPSAlwaysUserRules/`
