export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel, ImageRun } from 'docx';
import { prisma } from '@/lib/prisma';
import { getFileUrl } from '@/lib/s3';
import type { ReportFormData, DetailedEntry } from '@/lib/types';

// Helper to fetch image from S3/URL and return as Buffer
async function fetchImageBuffer(cloudPath: string): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const url = await getFileUrl(cloudPath, true);
    if (!url) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    // Default dimensions for report photos (fit within page width)
    // Use 450x300 as a reasonable default that fits within table cells
    return { buffer, width: 450, height: 300 };
  } catch (err) {
    console.error('Failed to fetch image:', cloudPath, err);
    return null;
  }
}

// Helper to get public URL for an image
async function getPhotoPublicUrl(cloudPath: string): Promise<string | null> {
  try {
    const url = await getFileUrl(cloudPath, true);
    return url || null;
  } catch {
    return null;
  }
}

function createBorderedCell(text: string, bold: boolean = false, width?: number): TableCell {
  const cellOpts: any = {
    children: [
      new Paragraph({
        children: [new TextRun({ text: text ?? '', bold, size: 20, font: 'Calibri' })],
        spacing: { before: 40, after: 40 },
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  };
  if (width) {
    cellOpts.width = { size: width, type: WidthType.DXA };
  }
  return new TableCell(cellOpts);
}

async function buildFlippedClassReport(data: ReportFormData): Promise<Document> {
  const sections: any[] = [];

  // Header paragraphs
  const headerParagraphs = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'CMR INSTITUTE OF TECHNOLOGY', bold: true, size: 28, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `ACADEMIC YEAR ${data?.academicYear ?? ''}`, bold: true, size: 24, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Flipped Classroom REPORT', bold: true, size: 24, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `DEPARTMENT OF ${(data?.department ?? '').toUpperCase()}`, bold: true, size: 24, font: 'Calibri' })] }),
    new Paragraph({ spacing: { after: 50 } }),
  ];

  // Info table
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createBorderedCell('Subject Code', true),
          createBorderedCell(data?.subjectCode ?? ''),
          createBorderedCell('Course Name', true),
          createBorderedCell(data?.courseName ?? ''),
        ],
      }),
      new TableRow({
        children: [
          createBorderedCell('Semester / Section', true),
          createBorderedCell(data?.semesterSection ?? ''),
          createBorderedCell('Prepared By', true),
          createBorderedCell(data?.preparedBy ?? ''),
        ],
      }),
      new TableRow({
        children: [
          createBorderedCell('Curriculum Gap Identified:', true),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: data?.curriculumGapIdentified ?? '', size: 20, font: 'Calibri' })] })],
            columnSpan: 3,
            borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
          }),
        ],
      }),
    ],
  });

  // Summary table
  const summaryHeader = new TableRow({
    children: [
      createBorderedCell('Sl No.', true),
      createBorderedCell('Topic', true),
      createBorderedCell('Date', true),
      createBorderedCell('Flipped Class Type', true),
      createBorderedCell('Total Students', true),
    ],
  });

  const summaryRows = (data?.sessions ?? []).map((s: any, i: number) =>
    new TableRow({
      children: [
        createBorderedCell(String((s?.slNo ?? i + 1))),
        createBorderedCell(s?.topic ?? ''),
        createBorderedCell(s?.date ?? ''),
        createBorderedCell(s?.subtype ?? ''),
        createBorderedCell(s?.totalStudents ?? ''),
      ],
    })
  );

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [summaryHeader, ...summaryRows],
  });

  // Detailed report tables
  const detailedParagraphs: any[] = [
    new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: 'Detailed Report', bold: true, size: 24, font: 'Calibri' })] }),
  ];

  for (const entry of data?.detailedEntries ?? []) {
    const de = entry as DetailedEntry;
    const detailHeader = new TableRow({
      children: [
        createBorderedCell(String(de?.slNo ?? ''), true),
        createBorderedCell(de?.topic ?? '', true),
        createBorderedCell(de?.date ?? '', true),
        createBorderedCell(de?.subtype ?? '', true),
        createBorderedCell(`No. of students: ${de?.totalStudents ?? ''}`, true),
      ],
    });

    // Build content paragraphs (including photos)
    const cellChildren: any[] = [];

    const addTextSection = (label: string, text: string) => {
      cellChildren.push(
        new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: label, bold: true, size: 20, font: 'Calibri' })] })
      );
      for (const line of (text ?? '').split('\n')) {
        cellChildren.push(
          new Paragraph({ children: [new TextRun({ text: line ?? '', size: 20, font: 'Calibri' })], spacing: { before: 20, after: 20 } })
        );
      }
    };

    if (de?.materialsShared) addTextSection('Materials Shared Before Class:', de.materialsShared);
    if (de?.conductionWriteup) addTextSection('Conduction of Flipped Classroom:', de.conductionWriteup);

    // Embed photos after conduction writeup (like the reference template)
    if (de?.photoUrls && de.photoUrls.length > 0) {
      cellChildren.push(
        new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: 'Classroom Photos:', bold: true, size: 20, font: 'Calibri' })] })
      );
      for (const photoPath of de.photoUrls) {
        const imgData = await fetchImageBuffer(photoPath);
        if (imgData) {
          cellChildren.push(
            new Paragraph({
              spacing: { before: 80, after: 80 },
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: imgData.buffer,
                  transformation: { width: imgData.width, height: imgData.height },
                  type: 'png',
                }),
              ],
            })
          );
        }
      }
    }

    if (de?.evaluationDetails) addTextSection('Evaluation:', de.evaluationDetails);
    if (de?.evaluationQuestions) addTextSection('Evaluation Questions:', de.evaluationQuestions);
    if (de?.performanceStats) addTextSection('Performance Statistics:', de.performanceStats);
    if (de?.outcome) addTextSection('Outcome:', de.outcome);
    if (de?.posAndPsos) addTextSection('POs and PSOs Addressed:', de.posAndPsos);

    const contentRow = new TableRow({
      children: [
        new TableCell({
          children: cellChildren,
          columnSpan: 5,
          borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
        }),
      ],
    });

    const detailTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [detailHeader, contentRow],
    });

    detailedParagraphs.push(detailTable);
    detailedParagraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  sections.push({
    children: [
      ...headerParagraphs,
      infoTable,
      new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: 'Summary of Flipped Classes conducted:', bold: true, size: 24, font: 'Calibri' })] }),
      summaryTable,
      ...detailedParagraphs,
    ],
  });

  return new Document({ sections });
}

async function buildVideoSessionReport(data: ReportFormData): Promise<Document> {
  const sections: any[] = [];

  const headerParagraphs = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'CMR INSTITUTE OF TECHNOLOGY', bold: true, size: 28, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `ACADEMIC YEAR ${data?.academicYear ?? ''}`, bold: true, size: 24, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Video Session REPORT', bold: true, size: 24, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `DEPARTMENT OF ${(data?.department ?? '').toUpperCase()}`, bold: true, size: 24, font: 'Calibri' })] }),
    new Paragraph({ spacing: { after: 50 } }),
  ];

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createBorderedCell('Subject Code', true),
          createBorderedCell(data?.subjectCode ?? ''),
          createBorderedCell('Course Name', true),
          createBorderedCell(data?.courseName ?? ''),
        ],
      }),
      new TableRow({
        children: [
          createBorderedCell('Semester / Section', true),
          createBorderedCell(data?.semesterSection ?? ''),
          createBorderedCell('Prepared By', true),
          createBorderedCell(data?.preparedBy ?? ''),
        ],
      }),
      new TableRow({
        children: [
          createBorderedCell('Curriculum Gap Identified:', true),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: data?.curriculumGapIdentified ?? '', size: 20, font: 'Calibri' })] })],
            columnSpan: 3,
            borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
          }),
        ],
      }),
    ],
  });

  const summaryHeader = new TableRow({
    children: [
      createBorderedCell('Sl No.', true),
      createBorderedCell('Topic', true),
      createBorderedCell('Date', true),
      createBorderedCell('Duration', true),
      createBorderedCell('Total Students', true),
    ],
  });

  const summaryRows = (data?.sessions ?? []).map((s: any, i: number) =>
    new TableRow({
      children: [
        createBorderedCell(String(s?.slNo ?? i + 1)),
        createBorderedCell(s?.topic ?? ''),
        createBorderedCell(s?.date ?? ''),
        createBorderedCell(s?.duration ?? ''),
        createBorderedCell(s?.totalStudents ?? ''),
      ],
    })
  );

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [summaryHeader, ...summaryRows],
  });

  const detailedParagraphs: any[] = [
    new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: 'Detailed Report', bold: true, size: 24, font: 'Calibri' })] }),
  ];

  for (const entry of data?.detailedEntries ?? []) {
    const de = entry as DetailedEntry;
    const detailHeader = new TableRow({
      children: [
        createBorderedCell(String(de?.slNo ?? ''), true),
        createBorderedCell(de?.topic ?? '', true),
        createBorderedCell(de?.date ?? '', true),
        createBorderedCell(de?.duration ?? '', true),
        createBorderedCell(`Total students: ${de?.totalStudents ?? ''}`, true),
      ],
    });

    // Build content paragraphs (including photos)
    const cellChildren: any[] = [];

    const addTextSection = (label: string, text: string) => {
      cellChildren.push(
        new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: label, bold: true, size: 20, font: 'Calibri' })] })
      );
      for (const line of (text ?? '').split('\n')) {
        cellChildren.push(
          new Paragraph({ children: [new TextRun({ text: line ?? '', size: 20, font: 'Calibri' })], spacing: { before: 20, after: 20 } })
        );
      }
    };

    if (de?.videoLink) addTextSection('Video Session Link:', de.videoLink);
    if (de?.duration) addTextSection('Duration:', de.duration);
    if (de?.learningOutcomes) addTextSection('Learning Outcomes:', de.learningOutcomes);

    // Embed photos
    if (de?.photoUrls && de.photoUrls.length > 0) {
      cellChildren.push(
        new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: 'Session Photos:', bold: true, size: 20, font: 'Calibri' })] })
      );
      for (const photoPath of de.photoUrls) {
        const imgData = await fetchImageBuffer(photoPath);
        if (imgData) {
          cellChildren.push(
            new Paragraph({
              spacing: { before: 80, after: 80 },
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: imgData.buffer,
                  transformation: { width: imgData.width, height: imgData.height },
                  type: 'png',
                }),
              ],
            })
          );
        }
      }
    }

    if (de?.curriculumGap) addTextSection('Curriculum Gap Addressed:', de.curriculumGap);
    if (de?.posAndPsos) addTextSection('POs and PSOs Addressed:', de.posAndPsos);
    if (de?.outcome) addTextSection('Outcome:', de.outcome);

    const contentRow = new TableRow({
      children: [
        new TableCell({
          children: cellChildren,
          columnSpan: 5,
          borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
        }),
      ],
    });

    const detailTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [detailHeader, contentRow],
    });

    detailedParagraphs.push(detailTable);
    detailedParagraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  sections.push({
    children: [
      ...headerParagraphs,
      infoTable,
      new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: 'Summary of Video Sessions conducted:', bold: true, size: 24, font: 'Calibri' })] }),
      summaryTable,
      ...detailedParagraphs,
    ],
  });

  return new Document({ sections });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const formData = body?.formData as ReportFormData;
    const format = body?.format ?? 'docx';

    if (!formData) {
      return NextResponse.json({ error: 'Form data is required' }, { status: 400 });
    }

    // Build DOCX
    const doc = formData?.sessionType === 'video_session'
      ? await buildVideoSessionReport(formData)
      : await buildFlippedClassReport(formData);

    const docxBuffer = await Packer.toBuffer(doc);

    // Track analytics
    try {
      await prisma.analytics.create({
        data: {
          type: 'report_generated',
          format,
          sessionType: formData?.sessionType ?? null,
        },
      });
    } catch (e: any) {
      console.error('Analytics tracking error:', e);
    }

    if (format === 'pdf') {
      // Generate HTML for PDF conversion
      const htmlContent = await generateReportHtml(formData);

      // Create PDF request
      const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_token: process.env.ABACUSAI_API_KEY,
          html_content: htmlContent,
          pdf_options: { format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } },
          base_url: process.env.NEXTAUTH_URL || '',
        }),
      });

      if (!createResponse?.ok) {
        // Fallback: return docx
        return new NextResponse(docxBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="report.docx"`,
          },
        });
      }

      const createResult = await createResponse.json();
      const requestId = createResult?.request_id;

      if (!requestId) {
        return new NextResponse(docxBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="report.docx"`,
          },
        });
      }

      // Poll for PDF
      let attempts = 0;
      const maxAttempts = 120;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId, deployment_token: process.env.ABACUSAI_API_KEY }),
        });
        const statusResult = await statusResponse?.json?.() ?? {};
        const status = statusResult?.status ?? 'FAILED';

        if (status === 'SUCCESS' && statusResult?.result?.result) {
          const pdfBuffer = Buffer.from(statusResult.result.result, 'base64');
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="report.pdf"`,
            },
          });
        } else if (status === 'FAILED') {
          break;
        }
        attempts++;
      }

      // Fallback to docx if PDF fails
      return new NextResponse(docxBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="report.docx"`,
        },
      });
    }

    // Return DOCX
    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="report.docx"`,
      },
    });
  } catch (error: any) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to generate report' }, { status: 500 });
  }
}

async function generateReportHtml(data: ReportFormData): Promise<string> {
  const isFlipped = data?.sessionType === 'flipped_class';
  const title = isFlipped ? 'Flipped Classroom REPORT' : 'Video Session REPORT';

  let sessionsHtml = '';
  for (const s of data?.sessions ?? []) {
    sessionsHtml += `<tr>
      <td>${s?.slNo ?? ''}</td>
      <td>${s?.topic ?? ''}</td>
      <td>${s?.date ?? ''}</td>
      <td>${isFlipped ? (s?.subtype ?? '') : (s?.duration ?? '')}</td>
      <td>${s?.totalStudents ?? ''}</td>
    </tr>`;
  }

  let detailsHtml = '';
  for (const de of data?.detailedEntries ?? []) {
    let content = '';
    if (isFlipped) {
      if (de?.materialsShared) content += `<p><strong>Materials Shared Before Class:</strong><br/>${de.materialsShared.replace(/\n/g, '<br/>')}</p>`;
      if (de?.conductionWriteup) content += `<p><strong>Conduction of Flipped Classroom:</strong><br/>${de.conductionWriteup.replace(/\n/g, '<br/>')}</p>`;
      // Embed photos
      if (de?.photoUrls && de.photoUrls.length > 0) {
        content += `<p><strong>Classroom Photos:</strong></p>`;
        for (const photoPath of de.photoUrls) {
          const photoUrl = await getPhotoPublicUrl(photoPath);
          if (photoUrl) {
            content += `<div style="text-align:center;margin:10px 0;"><img src="${photoUrl}" style="max-width:100%;max-height:400px;border:1px solid #ccc;" /></div>`;
          }
        }
      }
      if (de?.evaluationDetails) content += `<p><strong>Evaluation:</strong><br/>${de.evaluationDetails.replace(/\n/g, '<br/>')}</p>`;
      if (de?.evaluationQuestions) content += `<p><strong>Evaluation Questions:</strong><br/>${de.evaluationQuestions.replace(/\n/g, '<br/>')}</p>`;
      if (de?.performanceStats) content += `<p><strong>Performance Statistics:</strong><br/>${de.performanceStats.replace(/\n/g, '<br/>')}</p>`;
      if (de?.outcome) content += `<p><strong>Outcome:</strong><br/>${de.outcome.replace(/\n/g, '<br/>')}</p>`;
      if (de?.posAndPsos) content += `<p><strong>POs and PSOs Addressed:</strong><br/>${de.posAndPsos.replace(/\n/g, '<br/>')}</p>`;
    } else {
      if (de?.videoLink) content += `<p><strong>Video Link:</strong> ${de.videoLink}</p>`;
      if (de?.duration) content += `<p><strong>Duration:</strong> ${de.duration}</p>`;
      if (de?.learningOutcomes) content += `<p><strong>Learning Outcomes:</strong><br/>${de.learningOutcomes.replace(/\n/g, '<br/>')}</p>`;
      // Embed photos
      if (de?.photoUrls && de.photoUrls.length > 0) {
        content += `<p><strong>Session Photos:</strong></p>`;
        for (const photoPath of de.photoUrls) {
          const photoUrl = await getPhotoPublicUrl(photoPath);
          if (photoUrl) {
            content += `<div style="text-align:center;margin:10px 0;"><img src="${photoUrl}" style="max-width:100%;max-height:400px;border:1px solid #ccc;" /></div>`;
          }
        }
      }
      if (de?.curriculumGap) content += `<p><strong>Curriculum Gap:</strong><br/>${de.curriculumGap.replace(/\n/g, '<br/>')}</p>`;
      if (de?.posAndPsos) content += `<p><strong>POs and PSOs:</strong><br/>${de.posAndPsos.replace(/\n/g, '<br/>')}</p>`;
      if (de?.outcome) content += `<p><strong>Outcome:</strong><br/>${de.outcome.replace(/\n/g, '<br/>')}</p>`;
    }

    detailsHtml += `
      <table class="detail-table">
        <tr class="detail-header">
          <td><strong>${de?.slNo ?? ''}</strong></td>
          <td><strong>${de?.topic ?? ''}</strong></td>
          <td><strong>${de?.date ?? ''}</strong></td>
          <td><strong>${isFlipped ? (de?.subtype ?? '') : (de?.duration ?? '')}</strong></td>
          <td><strong>${isFlipped ? `No. of students: ${de?.totalStudents ?? ''}` : `Total: ${de?.totalStudents ?? ''}`}</strong></td>
        </tr>
        <tr><td colspan="5">${content}</td></tr>
      </table>
      <br/>`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; padding: 10mm; }
  h1, h2 { text-align: center; margin: 5px 0; }
  h1 { font-size: 14pt; }
  h2 { font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  td, th { border: 1px solid #333; padding: 6px 8px; font-size: 10pt; }
  .detail-header td { background: #f0f0f0; }
  .detail-table { margin-bottom: 15px; }
  p { margin: 4px 0; }
</style></head><body>
  <h1>CMR INSTITUTE OF TECHNOLOGY</h1>
  <h2>ACADEMIC YEAR ${data?.academicYear ?? ''}</h2>
  <h2>${title}</h2>
  <h2>DEPARTMENT OF ${(data?.department ?? '').toUpperCase()}</h2>
  <br/>
  <table>
    <tr><td><strong>Subject Code</strong></td><td>${data?.subjectCode ?? ''}</td><td><strong>Course Name</strong></td><td>${data?.courseName ?? ''}</td></tr>
    <tr><td><strong>Semester / Section</strong></td><td>${data?.semesterSection ?? ''}</td><td><strong>Prepared By</strong></td><td>${data?.preparedBy ?? ''}</td></tr>
    <tr><td><strong>Curriculum Gap Identified:</strong></td><td colspan="3">${data?.curriculumGapIdentified ?? ''}</td></tr>
  </table>
  <h3>Summary of ${isFlipped ? 'Flipped Classes' : 'Video Sessions'} conducted:</h3>
  <table>
    <tr>
      <th>Sl No.</th><th>Topic</th><th>Date</th>
      <th>${isFlipped ? 'Flipped Class Type' : 'Duration'}</th>
      <th>Total Students</th>
    </tr>
    ${sessionsHtml}
  </table>
  <h3>Detailed Report</h3>
  ${detailsHtml}
</body></html>`;
}
