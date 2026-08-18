"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"
import { Button, Card, Typography } from "@heroui/react"
import { ButtonLink } from "@/components/ui/button-link"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-md flex-col items-center"
      >
        <Link href="/" className="mb-6 inline-block hover:opacity-80 transition-opacity">
          <img
            src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp"
            alt="Hypastack"
            className="w-[52px] h-auto object-contain select-none"
            draggable={false}
          />
        </Link>

        <Card variant="transparent" className="w-full bg-overlay border !border-solid border-white/10 rounded-[16px]">
          <Card.Header>
            <div className="flex items-center gap-2.5">
              <MIcon name="error" className="text-danger" size={20} />
              <Card.Title className="text-xl">Something went wrong</Card.Title>
            </div>
            <Card.Description>
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </Card.Description>
            {error?.digest && (
              <Typography type="body-xs" color="muted" className="font-mono bg-white/[0.03] border border-white/10 rounded-md px-3 py-2">
                ref: {error.digest}
              </Typography>
            )}
          </Card.Header>
          <Card.Footer className="gap-3">
            <Button variant="primary" onPress={reset} className="flex-1">
              Try again
            </Button>
            <ButtonLink
              href="/"
              as={Link}
              variant="tertiary"
              size="lg"
              className="flex-1"
            >
              Home
            </ButtonLink>
          </Card.Footer>
        </Card>
      </motion.div>
    </main>
  )
}
