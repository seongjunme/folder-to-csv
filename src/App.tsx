import React, { useState } from "react";
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
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
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

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;

    const fileNames: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
      fileNames.push(fileList[i].name);
    }
    setFiles(fileNames);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExportCSV = () => {
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
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          폴더 파일명 CSV 변환기
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ mb: 3 }}>
            <input
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderUpload}
              style={{ display: "none" }}
              id="folder-upload"
            />
            <label htmlFor="folder-upload">
              <Button variant="contained" component="span" fullWidth>
                폴더 선택
              </Button>
            </label>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField
              label="제거할 문자 패턴 (정규식)"
              value={removePattern}
              onChange={(e) => setRemovePattern(e.target.value)}
              fullWidth
              placeholder="예: [0-9]+ 또는 특정문자"
            />
            <TextField
              label="혹시 필요한 접두사 (Prefix)"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              fullWidth
            />
          </Box>

          <Button variant="contained" color="primary" onClick={handleExportCSV} fullWidth disabled={files.length === 0}>
            CSV 다운로드
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            파일 목록 ({files.length}개)
          </Typography>
          <List>
            {files.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveFile(index)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={file} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
