import React, { useState, useCallback, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Grid,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";
import Papa from "papaparse";

// input 요소의 타입 확장
declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [prefix, setPrefix] = useState("");
  const [removePattern, setRemovePattern] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // 폴더 내부의 파일들을 재귀적으로 읽는 함수
  const readDirectory = async (directoryEntry: any): Promise<string[]> => {
    return new Promise((resolve) => {
      const fileNames: string[] = [];
      const directoryReader = directoryEntry.createReader();

      const readEntries = () => {
        directoryReader.readEntries(async (entries: any[]) => {
          if (entries.length === 0) {
            resolve(fileNames);
            return;
          }

          for (const entry of entries) {
            if (entry.isFile) {
              // 파일인 경우 파일명 추가
              if (!entry.name.startsWith(".")) {
                fileNames.push(entry.name);
              }
            } else if (entry.isDirectory) {
              // 디렉토리인 경우 재귀적으로 탐색
              const subFiles = await readDirectory(entry);
              fileNames.push(...subFiles);
            }
          }

          // 더 많은 엔트리가 있을 수 있으므로 계속 읽기
          readEntries();
        });
      };

      readEntries();
    });
  };

  const handleFolderUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const fileNames: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // 폴더에서 선택된 파일들 처리 (input으로 선택한 경우)
      if (file.webkitRelativePath && file.webkitRelativePath.trim() !== "") {
        // webkitRelativePath는 "폴더명/파일명" 또는 "폴더명/하위폴더명/파일명" 형태
        const pathParts = file.webkitRelativePath.split("/");
        const fileName = pathParts[pathParts.length - 1]; // 마지막 부분이 실제 파일명

        // 실제 파일인지 확인 (빈 문자열이 아니고, 숨김 파일이 아닌 경우)
        if (fileName && !fileName.startsWith(".") && file.size >= 0) {
          fileNames.push(fileName);
        }
      }
    }

    if (fileNames.length === 0) {
      alert("선택한 폴더에서 파일을 찾을 수 없습니다. 폴더에 파일이 있는지 확인해주세요.");
      return;
    }

    setFiles(fileNames);
  };

  // 드래그 앤 드롭 전용 처리 함수
  const handleDroppedItems = async (items: DataTransferItemList) => {
    const fileNames: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry();

        if (entry) {
          if (entry.isDirectory) {
            // 폴더인 경우 재귀적으로 파일들 읽기
            const directoryFiles = await readDirectory(entry);
            fileNames.push(...directoryFiles);
          } else if (entry.isFile) {
            // 단일 파일인 경우
            if (!entry.name.startsWith(".")) {
              fileNames.push(entry.name);
            }
          }
        }
      }
    }

    if (fileNames.length === 0) {
      alert("드래그한 폴더에서 파일을 찾을 수 없습니다. 폴더에 파일이 있는지 확인해주세요.");
      return;
    }

    setFiles(fileNames);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 드래그가 실제로 영역을 벗어났는지 확인
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // DataTransferItemList를 사용하여 폴더 구조를 읽기
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      handleDroppedItems(items);
    } else {
      // 폴백: 일반 파일 처리
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFolderUpload(files);
      }
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFolderUpload(files);
    }
    // input 값 리셋하여 같은 폴더를 다시 선택할 수 있게 함
    e.target.value = "";
  }, []);

  const handleRemovePatternChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRemovePattern(e.target.value);
  }, []);

  const handlePrefixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value);
  }, []);

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExportCSV = useCallback(() => {
    const processedFiles = files.map((file) => {
      let processedName = file;
      // 확장자 제거
      const lastDotIndex = processedName.lastIndexOf(".");
      if (lastDotIndex !== -1) {
        processedName = processedName.slice(0, lastDotIndex);
      }

      if (prefix) {
        processedName = prefix + processedName;
      }
      if (removePattern) {
        const regex = new RegExp(removePattern, "g");
        processedName = processedName.replace(regex, "");
      }
      return processedName;
    });

    const csvData = processedFiles.map((filename) => ({ filename }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "filenames.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [files, prefix, removePattern]);

  // 파일 목록을 메모이제이션하여 불필요한 리렌더링 방지
  const fileListItems = useMemo(() => {
    return files.map((file, index) => (
      <ListItem
        key={`${file}-${index}`}
        sx={{
          mb: 1,
          borderRadius: "4px",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        }}
        secondaryAction={
          <Tooltip title="삭제">
            <IconButton
              edge="end"
              onClick={() => handleRemoveFile(index)}
              sx={{
                color: "#f44336",
                "&:hover": {
                  backgroundColor: "rgba(244, 67, 54, 0.1)",
                },
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        }
      >
        <ListItemText
          primary={file}
          primaryTypographyProps={{
            sx: {
              fontSize: "0.95rem",
              color: "#333",
            },
          }}
        />
      </ListItem>
    ));
  }, [files]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: "center", mb: 5 }}>
        <Typography
          variant="h6"
          component="div"
          sx={{
            position: "relative",
            cursor: "pointer",
            color: "#666",
            "& > span": {
              transition: "opacity 0.3s ease",
            },
            "& > span.hover-text": {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              opacity: 0,
            },
            "&:hover > span:not(.hover-text)": {
              opacity: 0,
            },
            "&:hover > span.hover-text": {
              opacity: 1,
            },
          }}
        >
          <span>유진이의</span>
          <span className="hover-text">사실 성준이의</span>
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: "600",
            fontSize: { xs: "1.4rem", sm: "1.8rem", md: "2.2rem" },
            background: "linear-gradient(45deg, #1a1a1a, #333333)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            letterSpacing: "1.5px",
            fontFamily:
              '"SF Pro Display", "SF Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            lineHeight: 1.3,
            "&:hover": {
              background: "linear-gradient(45deg, #000000, #1a1a1a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              transform: "scale(1.02)",
              transition: "transform 0.3s ease",
            },
          }}
        >
          폴더 파일명 CSV 변환기
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "flex-start" },
          gap: 3,
        }}
      >
        {/* 드래그 앤 드롭 영역 */}
        <Box
          sx={{
            width: { xs: "100%", md: "33%" },
            order: { xs: 1, md: 1 },
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 3,
              height: "auto",
              background: "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
            }}
          >
            <Box
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.getElementById("folder-upload") as HTMLInputElement;
                if (input) {
                  input.click();
                }
              }}
              sx={{
                border: "2px dashed",
                borderColor: isDragging ? "#2196F3" : "#ccc",
                borderRadius: 2,
                p: { xs: 3, md: 4 },
                textAlign: "center",
                backgroundColor: isDragging ? "rgba(33, 150, 243, 0.1)" : "transparent",
                transition: "all 0.3s ease",
                cursor: "pointer",
                mb: 3,
                "&:hover": {
                  borderColor: "#2196F3",
                  backgroundColor: "rgba(33, 150, 243, 0.05)",
                },
              }}
            >
              <input
                type="file"
                webkitdirectory=""
                multiple
                onChange={handleFileInputChange}
                style={{ display: "none" }}
                id="folder-upload"
              />
              <FolderIcon
                sx={{
                  fontSize: { xs: 36, md: 48 },
                  color: "#2196F3",
                  mb: 2,
                }}
              />
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontSize: { xs: "1rem", md: "1.25rem" },
                }}
              >
                폴더를 여기에 드래그하세요
              </Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  fontSize: { xs: "0.75rem", md: "0.875rem" },
                }}
              >
                또는 클릭하여 폴더 선택
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                label="제거할 문자 패턴"
                value={removePattern}
                onChange={handleRemovePatternChange}
                fullWidth
                sx={{ mb: 2 }}
                variant="outlined"
                size="small"
              />
              <TextField
                label="혹시 필요한 접두사 (Prefix)"
                value={prefix}
                onChange={handlePrefixChange}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Box>

            <Button
              variant="contained"
              color="primary"
              onClick={handleExportCSV}
              fullWidth
              disabled={files.length === 0}
              startIcon={<DownloadIcon />}
              sx={{
                py: { xs: 1.2, md: 1.5 },
                background: "linear-gradient(45deg, #4CAF50 30%, #81C784 90%)",
                boxShadow: "0 3px 5px 2px rgba(76, 175, 80, .3)",
                "&:hover": {
                  background: "linear-gradient(45deg, #388E3C 30%, #66BB6A 90%)",
                },
                "&.Mui-disabled": {
                  background: "#e0e0e0",
                  boxShadow: "none",
                },
              }}
            >
              CSV 다운로드
            </Button>
          </Paper>
        </Box>

        {/* 파일 목록 */}
        <Box
          sx={{
            width: { xs: "100%", md: "67%" },
            order: { xs: 2, md: 2 },
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 3,
              height: "auto",
              minHeight: { xs: "300px", md: "500px" },
              background: "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                color: "linear-gradient(45deg, #000000, #1a1a1a)",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: { xs: "1rem", md: "1.25rem" },
              }}
            >
              파일 목록
              <Typography
                component="span"
                sx={{
                  color: "#666",
                  fontSize: { xs: "0.8rem", md: "0.9rem" },
                  fontWeight: "normal",
                }}
              >
                ({files.length}개)
              </Typography>
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List
              sx={{
                maxHeight: {
                  xs: "300px",
                  md: "calc(100vh - 300px)",
                },
                overflow: "auto",
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "#f1f1f1",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#888",
                  borderRadius: "4px",
                  "&:hover": {
                    background: "#555",
                  },
                },
              }}
            >
              {fileListItems}
            </List>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
