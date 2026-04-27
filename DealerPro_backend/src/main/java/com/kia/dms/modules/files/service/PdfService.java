package com.kia.dms.modules.files.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    public byte[] generateInvoice(Long id, String customerName, String email, BigDecimal amount, String date) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
            Paragraph title = new Paragraph("DEALERPRO INVOICE", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Invoice Info Table
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            
            infoTable.addCell(getNoBorderCell("Invoice ID: " + id));
            infoTable.addCell(getNoBorderCell("Date: " + date));
            infoTable.addCell(getNoBorderCell("Customer: " + customerName));
            infoTable.addCell(getNoBorderCell("Email: " + email));
            
            infoTable.setSpacingAfter(30);
            document.add(infoTable);

            // Items Table
            PdfPTable itemTable = new PdfPTable(new float[]{3, 1});
            itemTable.setWidthPercentage(100);
            
            PdfPCell h1 = new PdfPCell(new Phrase("Description", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            PdfPCell h2 = new PdfPCell(new Phrase("Amount", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            h1.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
            h2.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
            
            itemTable.addCell(h1);
            itemTable.addCell(h2);

            itemTable.addCell("Vehicle Purchase / Service Charges");
            itemTable.addCell("₹" + amount.toString());

            document.add(itemTable);

            // Total
            Paragraph total = new Paragraph("\nTotal Amount: ₹" + amount.toString(), 
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14));
            total.setAlignment(Element.ALIGN_RIGHT);
            document.add(total);

            // Footer
            Paragraph footer = new Paragraph("\n\nThank you for choosing DealerPro!", 
                FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10));
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return out.toByteArray();
    }

    public byte[] generateServiceReport(Long orderId, String dealerName, String vehicleName, String description, String status, String date) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
            Paragraph title = new Paragraph("SERVICE REPAIR REPORT", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Report Info Table
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            
            infoTable.addCell(getNoBorderCell("Order ID: " + orderId));
            infoTable.addCell(getNoBorderCell("Date: " + date));
            infoTable.addCell(getNoBorderCell("Dealer: " + dealerName));
            infoTable.addCell(getNoBorderCell("Status: " + status));
            
            infoTable.setSpacingAfter(30);
            document.add(infoTable);

            // Vehicle Section
            Paragraph vehicleHeading = new Paragraph("VEHICLE INFORMATION", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12));
            vehicleHeading.setSpacingAfter(10);
            document.add(vehicleHeading);

            PdfPTable vehicleTable = new PdfPTable(1);
            vehicleTable.setWidthPercentage(100);
            vehicleTable.addCell("Vehicle Model/Variant: " + vehicleName);
            vehicleTable.setSpacingAfter(20);
            document.add(vehicleTable);

            // Description Section
            Paragraph issueHeading = new Paragraph("ISSUE DESCRIPTION", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12));
            issueHeading.setSpacingAfter(10);
            document.add(issueHeading);

            Paragraph issueText = new Paragraph(description, FontFactory.getFont(FontFactory.HELVETICA, 11));
            issueText.setSpacingAfter(30);
            document.add(issueText);

            // Footer
            Paragraph footer = new Paragraph("\n\nThis is an automated service report generated by DealerPro.", 
                FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10));
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return out.toByteArray();
    }

    private PdfPCell getNoBorderCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text));
        cell.setBorder(Rectangle.NO_BORDER);
        return cell;
    }
}
