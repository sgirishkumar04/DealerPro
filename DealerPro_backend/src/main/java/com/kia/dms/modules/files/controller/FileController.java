package com.kia.dms.modules.files.controller;

import com.kia.dms.modules.files.entity.FileDocument;
import com.kia.dms.modules.files.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<FileDocument> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("module") String module,
            @RequestParam("referenceId") Long referenceId) throws IOException {
        return ResponseEntity.ok(fileService.uploadFile(file, module, referenceId));
    }

    @GetMapping("/module/{module}/{referenceId}")
    public ResponseEntity<List<FileDocument>> getFiles(
            @PathVariable String module,
            @PathVariable Long referenceId) {
        return ResponseEntity.ok(fileService.getFiles(module, referenceId));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        FileDocument doc = fileService.getFileMetadata(id);
        Resource resource = fileService.downloadFile(id);
        
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                .body(resource);
    }

    @GetMapping("/preview/{id}")
    public ResponseEntity<Resource> previewFile(@PathVariable Long id) {
        FileDocument doc = fileService.getFileMetadata(id);
        Resource resource = fileService.downloadFile(id);
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getFileType()))
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id) throws IOException {
        fileService.deleteFile(id);
        return ResponseEntity.noContent().build();
    }
}
