package com.kia.dms.modules.files.repository;

import com.kia.dms.modules.files.entity.FileDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FileDocumentRepository extends JpaRepository<FileDocument, Long> {
    List<FileDocument> findByModuleAndReferenceId(String module, Long referenceId);
}
