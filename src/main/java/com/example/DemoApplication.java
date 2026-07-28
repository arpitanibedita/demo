package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.*;
import java.util.List;
import java.io.IOException;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

// ---------------------------------------------
// 1. ENTITY (Database Table Design)
// ---------------------------------------------
@Entity
class FileAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String fileName;
    private String fileType;
    
    @Lob
    @Column(columnDefinition="LONGBLOB")
    private byte[] data;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
}

// ---------------------------------------------
// 2. REPOSITORY (Database Operations)
// ---------------------------------------------
interface FileAssetRepository extends JpaRepository<FileAsset, Long> { 
}

// ---------------------------------------------
// 3. CONTROLLER (API Endpoints)
// ---------------------------------------------
@RestController
@RequestMapping("/api/files")
@CrossOrigin("*") 
class FileController {
    
    private final FileAssetRepository repository;

    public FileController(FileAssetRepository repository) {
        this.repository = repository;
    }

    // Upload API
    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            FileAsset fileAsset = new FileAsset();
            fileAsset.setFileName(file.getOriginalFilename());
            fileAsset.setFileType(file.getContentType());
            fileAsset.setData(file.getBytes());
            
            repository.save(fileAsset);
            return ResponseEntity.ok("File uploaded successfully: " + file.getOriginalFilename());
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Error uploading the file!");
        }
    }

    // Get All Files API
    @GetMapping("/all")
    public List<FileAsset> getAllFiles() {
        return repository.findAll();
    }

    // Download API
    @GetMapping("/download/{id}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long id) {
        FileAsset fileAsset = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found!"));
                
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileAsset.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(fileAsset.getFileType()))
                .body(fileAsset.getData());
    }
}
