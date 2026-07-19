import { CodeBlock, MethodBadge } from "./code-block"
import { HEADING_FONT, PANEL } from "./doc-style"
import { type Endpoint, type EndpointParam } from "@/lib/docs/v3-endpoints"

function ParamTable({ title, params }: { title: string; params: EndpointParam[] }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#5a5f66] mb-2.5">{title}</p>
      <div className="divide-y divide-[rgba(255,255,255,0.05)]">
        {params.map((p) => (
          <div key={p.name} className="py-2.5 flex flex-col sm:flex-row sm:gap-5">
            <div className="sm:w-[180px] shrink-0 flex items-baseline gap-2">
              <code className="text-[12.5px] text-[#f7f8f8] font-mono">{p.name}</code>
              <span className="text-[10.5px] text-[#5a5f66]">{p.type}</span>
              {p.required && <span className="text-[9.5px] text-[#f0883e] tracking-wide uppercase">req</span>}
            </div>
            <p className="text-[13.5px] text-[#898e97] leading-relaxed mt-1 sm:mt-0">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <section id={endpoint.id} className="scroll-mt-28 mb-5 overflow-hidden" style={{ ...PANEL, borderRadius: 20 }}>
      <div className="px-5 sm:px-6 pt-5 pb-6">
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <MethodBadge method={endpoint.method} />
          <code className="text-[13.5px] text-[#f7f8f8] font-mono">{endpoint.path}</code>
          <code className="text-[10.5px] text-[#6b7076] font-mono ml-auto px-2 py-[3px] rounded-full bg-[rgba(255,255,255,0.04)]">
            {endpoint.scope}
          </code>
        </div>

        <h3 className="text-[18px] font-semibold text-[#f7f8f8] tracking-tight mb-2" style={HEADING_FONT}>
          {endpoint.title}
        </h3>
        <p className="text-[14px] text-[#898e97] leading-[1.7] mb-5 max-w-[62ch]">{endpoint.description}</p>

        {endpoint.query && <ParamTable title="Query" params={endpoint.query} />}
        {endpoint.params && <ParamTable title="Body" params={endpoint.params} />}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <CodeBlock label="Request" code={buildCurl(endpoint)} />
          <CodeBlock label="Response" code={endpoint.response} />
        </div>
      </div>
    </section>
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
