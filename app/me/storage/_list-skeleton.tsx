import { Skeleton, Table } from "@heroui/react"

// Mirrors ListView: the same HeroUI Table, same columns and cell padding, so the
// real rows drop into these slots with nothing shifting. Widths vary per row to
// read like filenames rather than a stack of identical bars.
const NAME_WIDTHS = ["58%", "34%", "71%", "45%", "62%", "29%"]

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Table className="-mr-1 -mb-1">
      <Table.ScrollContainer>
        <Table.Content aria-label="Loading files and folders">
          <Table.Header>
            <Table.Column className="w-10 pr-2 py-2">
              <Skeleton className="h-[18px] w-[18px] rounded-[5px]" />
            </Table.Column>
            <Table.Column isRowHeader className="py-2 !pl-8">Name</Table.Column>
            <Table.Column className="w-28 text-right py-2">Size</Table.Column>
          </Table.Header>
          <Table.Body>
            {Array.from({ length: rows }).map((_, i) => (
              <Table.Row key={i} id={i}>
                <Table.Cell className="w-10 pr-2 py-2">
                  <Skeleton className="h-[18px] w-[18px] rounded-[5px]" />
                </Table.Cell>
                <Table.Cell className="py-2 !pl-2">
                  <div className="flex items-center gap-1 min-w-0">
                    {/* stands in for the folder chevron, same box the real rows reserve */}
                    <span className="h-5 w-7 -mx-1 shrink-0" />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Skeleton className="h-[14px] w-[14px] shrink-0 rounded-sm" />
                      <Skeleton className="h-[14px] rounded-md" style={{ width: NAME_WIDTHS[i % NAME_WIDTHS.length], maxWidth: 320 }} />
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="w-28 py-2">
                  <Skeleton className="ml-auto h-[14px] w-[52px] rounded-md" />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
