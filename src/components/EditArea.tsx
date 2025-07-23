import React, { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';

function EditArea() {
  const [content, setContent] = useState<string>('');
  const [lineCount, setLineCount] = useState<number>(1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLineCount(content.split('\n').length);
  }, [content]);

  // Handle changes in the textarea
  const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  }, []);

  // Synchronize scrolling between the textarea and the line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      // Set the scroll position of the line numbers div to match the textarea
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Generate line number elements
  const renderLineNumbers = useCallback(() => {
    const numbers = [];
    for (let i = 1; i <= lineCount; i++) {
      numbers.push(<div key={i} className="line-number h-6 flex items-center justify-end pr-2">{i}</div>);
    }
    return numbers;
  }, [lineCount]);

  type FileLoaded = {
    fileName: string,
    content: string
  }

  listen<FileLoaded>('file-loaded', (e) => {
    setContent(e.payload.content)
  })

  listen<FileLoaded>('save', (e) => {
    invoke("save_file", {fileContent: content})
  })

  return (
    <div>
      <div className="flex flex-col w-full max-h-screen h-[100vh] bg-gray-800 overflow-hidden">
        {/* Editor Wrapper: Contains line numbers and textarea */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Line Numbers Pane */}
          <div
            className="flex-shrink-0 w-12 bg-gray-50 text-gray-500 text-sm text-right px-5 py-2 border-r border-gray-200 overflow-hidden select-none resize-x"
            ref={lineNumbersRef}
          >
            {renderLineNumbers()}
          </div>

          {/* Text Input Area */}
          <textarea
            ref={textareaRef}
            className="flex-1 w-full p-2 text-base leading-6 bg-white resize-none overflow-y-auto text-nowrap focus:outline-none focus:ring-0"
            value={content}
            onChange={handleContentChange}
            onScroll={handleScroll}
            placeholder="Start typing here..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

export default EditArea;
