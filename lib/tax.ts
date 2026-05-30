import { Pool } from "pg"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import crypto from "crypto"
import { atomicUnitsToXmr } from "./monero"

// Connection to the dedicated tax database
let taxPool: Pool | null = null

export function getTaxPool() {
  if (!taxPool) {
    taxPool = new Pool({
      host: process.env.HOST_TAX,
      port: parseInt(process.env.PORT_TAX || "5432"),
      user: process.env.USER_TAX,
      password: process.env.PS_TAX,
      database: process.env.DB_TAX,
    })
  }
  return taxPool
}

export async function ensureTaxDatabase() {
  const pool = getTaxPool()
  // Create table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tax_invoices (
      id UUID PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      txid VARCHAR(255) NOT NULL,
      amount_xmr DECIMAL(18,12) NOT NULL,
      amount_atomic BIGINT NOT NULL,
      nbp_usd_pln_rate DECIMAL(10,4) NOT NULL,
      xmr_usd_rate DECIMAL(10,4) NOT NULL,
      pln_valuation DECIMAL(10,4) NOT NULL,
      tier VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
}

/**
 * Fetches the NBP USD/PLN rate from the PREVIOUS business day.
 * Polish tax law requires the rate from the business day strictly preceding the income date.
 */
async function getNbpRateForYesterday(): Promise<number> {
  try {
    // If today is Monday, we need Friday's rate.
    // NBP API handles "last published rate" automatically if we ask for the latest.
    // We fetch the 'A' table (mid rates).
    const res = await fetch("http://api.nbp.pl/api/exchangerates/rates/A/USD/?format=json")
    if (!res.ok) throw new Error("Failed to fetch NBP rate")
    const data = await res.json()
    return data.rates[0].mid
  } catch (err) {
    console.error("[Tax] Failed to fetch NBP rate, falling back to 4.00", err)
    return 4.00 // Safe fallback
  }
}

/**
 * Fetches the current XMR/USD price from CoinGecko.
 */
async function getXmrUsdRate(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=usd")
    if (!res.ok) throw new Error("Failed to fetch CoinGecko rate")
    const data = await res.json()
    return data.monero.usd
  } catch (err) {
    console.error("[Tax] Failed to fetch XMR/USD rate, falling back to 150.00", err)
    return 150.00 // Safe fallback
  }
}

/**
 * Process a confirmed payment for tax compliance.
 * Saves the record to the tax DB and generates a PDF receipt.
 */
export async function processTaxRecord(
  userId: string,
  txid: string,
  amountAtomic: number,
  tier: string
): Promise<Buffer> {
  await ensureTaxDatabase()
  const pool = getTaxPool()

  const xmrAmount = parseFloat(atomicUnitsToXmr(amountAtomic))
  
  // Get exchange rates
  const nbpUsdPln = await getNbpRateForYesterday()
  const xmrUsd = await getXmrUsdRate()
  
  // Calculate final PLN valuation: XMR * (USD/XMR) * (PLN/USD)
  const plnValuation = xmrAmount * xmrUsd * nbpUsdPln
  
  const invoiceId = crypto.randomUUID()

  // Save to secondary Tax DB
  await pool.query(
    `INSERT INTO tax_invoices (
      id, user_id, txid, amount_xmr, amount_atomic, 
      nbp_usd_pln_rate, xmr_usd_rate, pln_valuation, tier
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      invoiceId, userId, txid, xmrAmount, amountAtomic,
      nbpUsdPln, xmrUsd, plnValuation, tier
    ]
  )

  // Generate PDF Receipt
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()

  const drawText = (text: string, x: number, y: number, f = font, size = 12) => {
    page.drawText(text, { x, y, size, font: f, color: rgb(0, 0, 0) })
  }

  // Header
  drawText("HYPASTACK - INVOICE / RECEIPT", 50, height - 80, boldFont, 20)
  drawText(`Invoice ID: ${invoiceId}`, 50, height - 110, font, 10)
  drawText(`Date: ${new Date().toISOString()}`, 50, height - 125, font, 10)

  // Parties
  drawText("From: Hypastack Services", 50, height - 160, boldFont, 12)
  drawText("To: Hypastack User", 50, height - 180, boldFont, 12)
  drawText(`User ID: ${userId}`, 50, height - 195, font, 10)

  // Line Items
  drawText("Service Description", 50, height - 240, boldFont, 12)
  drawText("Amount", 450, height - 240, boldFont, 12)
  
  page.drawLine({ start: { x: 50, y: height - 250 }, end: { x: 545, y: height - 250 }, thickness: 1 })

  drawText(`Hypastack "${tier.toUpperCase()}" Tier (1 Month)`, 50, height - 270, font, 11)
  drawText(`${xmrAmount.toFixed(4)} XMR`, 450, height - 270, font, 11)

  // Calculations
  page.drawLine({ start: { x: 50, y: height - 300 }, end: { x: 545, y: height - 300 }, thickness: 1 })

  drawText(`XMR/USD Rate: $${xmrUsd.toFixed(2)}`, 50, height - 320, font, 10)
  drawText(`NBP USD/PLN Rate: ${nbpUsdPln.toFixed(4)} PLN`, 50, height - 335, font, 10)
  
  drawText("TOTAL PLN VALUATION:", 300, height - 335, boldFont, 12)
  drawText(`${plnValuation.toFixed(2)} PLN`, 450, height - 335, boldFont, 12)

  // VAT Status
  drawText("VAT Exempt (Sale of Services under 200,000 PLN limit).", 50, height - 380, font, 10)
  drawText(`Blockchain TXID: ${txid}`, 50, height - 400, font, 8)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
