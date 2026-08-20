import { Card, Chip, Separator, Typography } from "@heroui/react"
import { CodeBlock, MethodBadge } from "./code-block"
import { type Endpoint, type EndpointParam } from "@/lib/docs/v3-endpoints"

function ParamTable({ title, params }: { title: string; params: EndpointParam[] }) {
  return (
    <div className="mb-5">
      <Typography type="body-xs" weight="semibold" className="tracking-[0.08em] uppercase text-muted mb-2.5">{title}</Typography>
      <Separator />
      {params.map((p) => (
        <div key={p.name}>
          <div className="py-2.5 flex flex-col sm:flex-row sm:gap-5">
            <div className="sm:w-[180px] shrink-0 flex items-baseline gap-2">
              <code className="text-[12.5px] text-foreground font-mono">{p.name}</code>
              <Typography type="body-xs" color="muted">{p.type}</Typography>
              {p.required && <Chip size="sm" variant="soft" color="warning" className="uppercase tracking-wide">req</Chip>}
            </div>
            <Typography type="body-sm" color="muted" className="leading-relaxed mt-1 sm:mt-0">{p.description}</Typography>
          </div>
          <Separator />
        </div>
      ))}
    </div>
  )
}

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <Card
      id={endpoint.id}
      className="scroll-mt-28 mb-5 !p-0 !gap-0 overflow-hidden rounded-[20px]"
    >
      <Card.Content className="px-5 sm:px-6 pt-5 pb-6">
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <MethodBadge method={endpoint.method} />
          <code className="text-[13.5px] text-foreground font-mono">{endpoint.path}</code>
          <Chip size="sm" variant="soft" className="ml-auto font-mono text-[10.5px]">{endpoint.scope}</Chip>
        </div>

        <Card.Title className="text-[18px] mb-2">{endpoint.title}</Card.Title>
        <Typography type="body-sm" color="muted" className="leading-[1.7] mb-5 max-w-[62ch]">{endpoint.description}</Typography>

        {endpoint.query && <ParamTable title="Query" params={endpoint.query} />}
        {endpoint.params && <ParamTable title="Body" params={endpoint.params} />}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <CodeBlock label="Request" code={buildCurl(endpoint)} />
          <CodeBlock label="Response" code={endpoint.response} />
        </div>
      </Card.Content>
    </Card>
  )
}

function buildCurl(endpoint: Endpoint): string {
  const path = endpoint.path.replace("{id}", "FILE_ID")
  const lines = [`curl -X ${endpoint.method} \\`, `  "https://api.hypastack.com/v3${path}" \\`]
  lines.push(`  -H "Authorization: Bearer $HYPASTACK_API_KEY"`)

  if (endpoint.params) {
    const body = endpoint.params
      .filter((p) => p.required)
      .map((p) => `"${p.name}": ${exampleValue(p)}`)
      .join(", ")
    lines[lines.length - 1] += ` \\`
    lines.push(`  -H "Content-Type: application/json" \\`)
    lines.push(`  -d '{ ${body} }'`)
  }

  return lines.join("\n")
}

function exampleValue(p: EndpointParam): string {
  if (p.type === "integer") return "28"
  if (p.type === "boolean") return "false"
  if (p.name === "content_type") return '"text/plain"'
  return '"hello.txt"'
}
