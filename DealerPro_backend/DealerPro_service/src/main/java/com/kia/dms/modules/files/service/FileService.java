package com.kia.dms.modules.files.service;

import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.files.entity.FileDocument;
import com.kia.dms.modules.files.repository.FileDocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.IOException;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;

@Service
public class FileService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Autowired
    private FileDocumentRepository fileRepository;

    public FileDocument uploadFile(MultipartFile file, String module, Long referenceId) throws IOException {
        // Validate file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds 5MB limit");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !(contentType.equals("application/pdf") || 
            contentType.equals("image/jpeg") || 
            contentType.equals("image/png"))) {
            throw new IllegalArgumentException("Only PDF, JPG, and PNG files are allowed");
        }

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = "";
        
        if (originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        
        Path modulePath = Paths.get(uploadDir).resolve(module.toLowerCase()).resolve(referenceId.toString());
        if (!Files.exists(modulePath)) {
            Files.createDirectories(modulePath);
        }
        
        // Use original filename but handle potential duplicates with a timestamp prefix
        String storedFileName = System.currentTimeMillis() + "_" + originalFileName;
        Path targetLocation = modulePath.resolve(storedFileName);
        
        long finalSize;
        if (contentType != null && (contentType.equals("image/jpeg") || contentType.equals("image/png"))) {
            // Compress image before saving
            finalSize = compressAndSaveImage(file, targetLocation, contentType);
        } else {
            // Save non-image files as is
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            finalSize = file.getSize();
        }
        
        FileDocument doc = new FileDocument();
        doc.setFileName(originalFileName);
        doc.setFileType(file.getContentType());
        doc.setFilePath(targetLocation.toString());
        doc.setModule(module.toUpperCase());
        doc.setReferenceId(referenceId);
        doc.setFileSize(finalSize);
        
        return fileRepository.save(doc);
    }

    private long compressAndSaveImage(MultipartFile file, Path targetLocation, String contentType) throws IOException {
        // 1. Save the original file first as a backup/baseline
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        long originalSize = file.getSize();
        
        try {
            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image == null) return originalSize;

            String formatName = contentType.equals("image/png") ? "png" : "jpg";
            Path tempCompressed = Files.createTempFile("compress_", "_" + targetLocation.getFileName().toString());
            
            try {
                if (formatName.equals("jpg") || contentType.equalsIgnoreCase("image/jpeg")) {
                    // JPEG Compression with 50% quality for significant reduction
                    Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
                    if (writers.hasNext()) {
                        ImageWriter writer = writers.next();
                        try (ImageOutputStream ios = ImageIO.createImageOutputStream(Files.newOutputStream(tempCompressed))) {
                            writer.setOutput(ios);
                            ImageWriteParam param = writer.getDefaultWriteParam();
                            if (param.canWriteCompressed()) {
                                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                                param.setCompressionQuality(0.5f); // 50% quality - better compression
                            }
                            writer.write(null, new IIOImage(image, null, null), param);
                        } finally {
                            writer.dispose();
                        }
                    } else {
                        ImageIO.write(image, "jpg", tempCompressed.toFile());
                    }
                } else {
                    // PNG compression
                    ImageIO.write(image, "png", tempCompressed.toFile());
                }
                
                long compressedSize = Files.size(tempCompressed);
                
                // 2. Only replace if the compressed version is actually smaller
                if (compressedSize < originalSize) {
                    Files.copy(tempCompressed, targetLocation, StandardCopyOption.REPLACE_EXISTING);
                    return compressedSize;
                } else {
                    // Keep original
                    return originalSize;
                }
            } finally {
                Files.deleteIfExists(tempCompressed);
            }
        } catch (Exception e) {
            // On error, we already have the original saved at targetLocation
            return originalSize;
        }
    }

    public Resource downloadFile(Long id) {
        FileDocument doc = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        
        try {
            Path filePath = Paths.get(doc.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File not found on disk");
            }
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("File not found on disk");
        }
    }

    public List<FileDocument> getFiles(String module, Long referenceId) {
        return fileRepository.findByModuleAndReferenceId(module.toUpperCase(), referenceId);
    }

    public void deleteFile(Long id) throws IOException {
        FileDocument doc = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        
        Path filePath = Paths.get(doc.getFilePath());
        Files.deleteIfExists(filePath);
        fileRepository.delete(doc);
    }

    public FileDocument getFileMetadata(Long id) {
        return fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
    }
}
