import PDFDocument from "pdfkit";
import { Writable } from "stream";

export async function generateContractPDF(
  contractText: string,
  params: {
    taskTitle: string;
    customerName: string;
    executorName: string;
    amount: number;
    contractId: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      info: {
        Title: `Договор — ${params.taskTitle}`,
        Author: "Taskchi",
        Subject: "Договор оказания услуг",
      },
    });

    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("TASKCHI", { align: "center" })
      .fontSize(10)
      .font("Helvetica")
      .text("Маркетплейс задач | Таджикистан", { align: "center" })
      .moveDown(0.5);

    // Divider
    doc
      .moveTo(60, doc.y)
      .lineTo(535, doc.y)
      .stroke()
      .moveDown(1);

    // Title
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("ДОГОВОР ОКАЗАНИЯ УСЛУГ", { align: "center" })
      .moveDown(0.5)
      .fontSize(10)
      .font("Helvetica")
      .text(`№ ${params.contractId}`, { align: "center" })
      .moveDown(1.5);

    // Contract content
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(contractText, {
        align: "justify",
        lineGap: 4,
      })
      .moveDown(2);

    // Footer
    doc
      .moveTo(60, doc.y)
      .lineTo(535, doc.y)
      .stroke()
      .moveDown(0.5)
      .fontSize(9)
      .fillColor("#666666")
      .text(
        `Документ сгенерирован автоматически платформой Taskchi. ID: ${params.contractId}`,
        { align: "center" }
      );

    doc.end();

    stream.on("finish", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", reject);
  });
}
