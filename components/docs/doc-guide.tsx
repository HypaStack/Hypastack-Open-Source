import { Chip, Separator, Typography } from "@heroui/react"
import { CodeBlock } from "./code-block"
import { V3_SCOPES, V3_SCOPE_LABELS } from "@/lib/http/v3/scopes"
import { ERROR_CODES, TIER_TABLE } from "@/lib/docs/v3-endpoints"

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Typography type="h2" id={id} className="scroll-mt-28 text-foreground mb-3 mt-16 first:mt-0">
      {children}
    </Typography>
  )
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Typography type="body" color="muted" className={`mb-4 max-w-[62ch] ${className ?? ""}`}>
      {children}
    </Typography>
  )
}

export function DocGuide() {
  return (
    <>
      <H2 id="quickstart">Quickstart</H2>
      <P>
        Three things and you&apos;re running: make a key, put it in your environment, call the API. The whole thing is
        plain HTTP and JSON, so you don&apos;t need a library.
      </P>
      <P>
        Open <strong className="text-foreground">Settings → Account</strong>, turn on <strong className="text-foreground">Developer mode</strong>,
        then go to the <strong className="text-foreground">Developer</strong> tab and hit <strong className="text-foreground">New key</strong>.
        Pick a name and tick only the permissions you need. The key is shown once and never again, so copy it then.
      </P>
      <CodeBlock
        label="Your first call"
        code={`export HYPASTACK_API_KEY="hsk_your_key_here"

curl "https://api.hypastack.com/v3/files" \\
  -H "Authorization: Bearer $HYPASTACK_API_KEY"`}
      />
      <P className="mt-4">
        That returns your files. If it returns <code className="text-foreground">401</code>, the key is wrong. If it
        returns <code className="text-foreground">403 plan_required</code>, your plan has no API access.
      </P>

      <H2 id="encryption">Encryption, and what it doesn&apos;t cover</H2>
      <P>
        Read this before you build anything that handles other people&apos;s files.
      </P>
      <P>
        When someone uploads through hypastack.com, their browser encrypts the file before it leaves their device and
        keeps the key in the link&apos;s <code className="text-foreground">#fragment</code>. We never receive that key, so
        we cannot read the file. That is the zero-knowledge property the product is built on.
      </P>
      <P>
        <strong className="text-foreground">The API does not do this.</strong> There is no browser in the loop to hold a
        key, so files uploaded through v3 are stored as you send them. We can read them. Filenames are still encrypted at
        rest, but the contents are not.
      </P>
      <P>
        There are two consequences, and neither is subtle:
      </P>
      <ul className="text-muted-foreground list-disc pl-5 space-y-1.5 mb-4 max-w-[62ch]">
        <li>
          Everything uploaded with your key lands in <em>your</em> account, and you can read all of it. If your app lets
          other people upload, you can see what they upload.
        </li>
        <li>
          So can we. Anything your users send through your app does not get the privacy guarantee they would get by
          using hypastack.com directly.
        </li>
      </ul>
      <P>
        If you are building something where users upload their own content, tell them this plainly in your own privacy
        policy. You are the one holding their data. If you need the files to be unreadable by us, encrypt them yourself
        before the PUT and keep the key. We will store whatever bytes you send.
      </P>
      <P>
        For CDN assets none of this applies: they are public by design, served from a URL anyone can fetch, and were
        never encrypted.
      </P>

      <H2 id="authentication">Authentication</H2>
      <P>
        Every request carries your key as a bearer token. There are no cookies, no sessions, and no CSRF tokens. A
        browser session can never authenticate against this API, which is deliberate.
      </P>
      <CodeBlock code={`Authorization: Bearer hsk_EXAMPLE0000000000000000000000000000000000`} />
      <P className="mt-4">
        Keys start with <code className="text-foreground">hsk_</code>. Treat one like a password: it acts on your account
        with whatever permissions you gave it. We only ever store a hash, so if you lose it we cannot recover it. Make a
        new one and revoke the old. Revoking takes effect immediately.
      </P>
      <P>
        Keep keys out of source control and out of client-side code. Anything in a browser bundle is public.
      </P>

      <H2 id="scopes">Scopes</H2>
      <P>
        Each key carries its own permissions, chosen when you create it. Nothing is implied, a key with{" "}
        <code className="text-foreground">files.read</code> cannot upload, and one with{" "}
        <code className="text-foreground">files.write</code> cannot delete. Give each key the least it needs, so a leak
        costs you as little as possible.
      </P>
      <Separator className="mb-4" />
      {V3_SCOPES.map((scope) => (
        <div key={scope}>
          <div className="py-2.5 flex flex-col sm:flex-row sm:gap-4">
            <code className="sm:w-[190px] shrink-0 text-[12.5px] text-foreground font-mono">{scope}</code>
            <Typography type="body-sm" color="muted" className="mt-1 sm:mt-0">{V3_SCOPE_LABELS[scope]}</Typography>
          </div>
          <Separator />
        </div>
      ))}
      <P className="mt-4">
        Calling an endpoint without its scope returns <code className="text-foreground">403 insufficient_scope</code>, and
        the message names the scope you need.
      </P>

      <H2 id="uploading">Uploading</H2>
      <P>
        Uploads take three steps, and they are the same three for files and for CDN assets. Learn it once.
      </P>
      <ol className="text-muted-foreground list-decimal pl-5 space-y-1.5 mb-4 max-w-[62ch]">
        <li>Tell us the name, size and type. You get back an <code className="text-foreground">upload_url</code>.</li>
        <li>PUT the raw bytes to that URL. They go straight to storage and never touch our servers.</li>
        <li>Call <code className="text-foreground">/complete</code>. Now the file exists.</li>
      </ol>
      <CodeBlock
        label="The full flow"
        code={`# 1. reserve
INIT=$(curl -s -X POST "https://api.hypastack.com/v3/files" \\
  -H "Authorization: Bearer $HYPASTACK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "hello.txt", "size": 28, "content_type": "text/plain" }')

ID=$(echo "$INIT" | jq -r .id)
URL=$(echo "$INIT" | jq -r .upload_url)

# 2. send the bytes straight to storage
curl -X PUT "$URL" -H "Content-Type: text/plain" --data-binary @hello.txt

# 3. commit
curl -X POST "https://api.hypastack.com/v3/files/$ID/complete" \\
  -H "Authorization: Bearer $HYPASTACK_API_KEY"`}
      />
      <P className="mt-4">
        Step 3 is safe to repeat. If your connection drops and you are not sure the call landed, just call it again.
        You get the same file back rather than an error.
      </P>
      <P>
        This is why bytes are fast: your upload goes directly to storage rather than being relayed through us, so a large
        file is limited by your connection and nothing else.
      </P>

      <H2 id="pagination">Pagination</H2>
      <P>
        Lists are paged with a cursor. Ask for up to 100 at a time; the response tells you whether there is more and how
        to get it. There are no page numbers or offsets, because rows created while you page would make those skip or
        repeat items.
      </P>
      <CodeBlock
        label="Paging through everything"
        code={`let cursor = null

do {
  const url = new URL("https://api.hypastack.com/v3/files")
  url.searchParams.set("limit", "100")
  if (cursor) url.searchParams.set("cursor", cursor)

  const res = await fetch(url, {
    headers: { authorization: \`Bearer \${process.env.HYPASTACK_API_KEY}\` },
  })
  const page = await res.json()

  for (const file of page.data) console.log(file.name)
  cursor = page.next_cursor
} while (cursor)`}
      />

      <H2 id="errors">Errors</H2>
      <P>
        Every failure looks the same. Switch on <code className="text-foreground">error.code</code>, it is stable.
        Never parse <code className="text-foreground">error.message</code>; it is written for humans and we reword it
        freely.
      </P>
      <CodeBlock
        label="Every error, without exception"
        code={`{
  "error": {
    "code": "insufficient_scope",
    "message": "This key does not have the files.delete scope.",
    "status": 403,
    "request_id": "req_8fK2mQ"
  }
}`}
      />
      <P className="mt-4">
        Every response, success or failure, also carries an <code className="text-foreground">X-Request-Id</code>{" "}
        header. Quote it if you report a problem and we can find the exact line in our logs.
      </P>
      <P>
        If you meet a code you don&apos;t recognise, fall back to the HTTP status. We only ever add codes, never
        repurpose them, so treating an unknown code by its status is always safe.
      </P>
      <Separator className="mb-4" />
      {ERROR_CODES.map((e) => (
        <div key={e.code}>
          <div className="py-2.5 flex flex-col sm:flex-row sm:gap-4">
            <div className="sm:w-[220px] shrink-0 flex items-center gap-2">
              <Chip size="sm" variant="soft" color={e.status >= 500 ? "danger" : "warning"} className="font-mono">{e.status}</Chip>
              <code className="text-[12.5px] text-foreground font-mono">{e.code}</code>
            </div>
            <Typography type="body-sm" color="muted" className="leading-relaxed mt-1 sm:mt-0">{e.when}</Typography>
          </div>
          <Separator />
        </div>
      ))}
      <P>
        One thing worth knowing: <code className="text-foreground">404 not_found</code> is returned both when something
        never existed and when it belongs to someone else. That is on purpose, otherwise anyone with a key could probe
        ids to discover what other accounts hold.
      </P>

      <H2 id="rate-limits">Rate limits</H2>
      <P>
        Each key gets its own budget per minute, so one runaway script can&apos;t starve your other keys.
      </P>
      <Separator />
      <div className="py-2 flex">
        <Typography type="body-xs" weight="semibold" className="w-1/3 tracking-[0.06em] uppercase text-muted">Plan</Typography>
        <Typography type="body-xs" weight="semibold" className="w-1/3 tracking-[0.06em] uppercase text-muted">Keys</Typography>
        <Typography type="body-xs" weight="semibold" className="w-1/3 tracking-[0.06em] uppercase text-muted">Requests</Typography>
      </div>
      <Separator />
      {TIER_TABLE.map((row) => (
        <div key={row.tier}>
          <div className="py-2.5 flex text-[13px]">
            <span className="w-1/3 text-foreground">{row.tier}</span>
            <span className="w-1/3 text-muted-foreground">{row.keys}</span>
            <span className="w-1/3 text-muted-foreground">{row.rate}</span>
          </div>
          <Separator />
        </div>
      ))}
      <P className="mt-5">Every response tells you where you stand, so you never have to guess:</P>
      <CodeBlock
        code={`X-RateLimit-Limit: 600
X-RateLimit-Remaining: 594
X-RateLimit-Reset: 1784500860`}
      />
      <P className="mt-4">
        Go over and you get <code className="text-foreground">429 rate_limit_exceeded</code> with a{" "}
        <code className="text-foreground">Retry-After</code> header in seconds. Wait that long and carry on.
      </P>
      <P>
        Separately, there is a ceiling across all API traffic that protects the service as a whole. If we are shedding
        load you will see <code className="text-foreground">503 server_busy</code>, also with{" "}
        <code className="text-foreground">Retry-After</code>. It is rare, it is not your fault, and retrying works.
        Those two are the only failures worth retrying automatically.
      </P>
    </>
  )
}
