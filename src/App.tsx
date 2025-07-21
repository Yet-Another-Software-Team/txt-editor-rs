import React, { useState, useRef, useEffect, useCallback } from 'react';

function App() {
  // State to hold the content of the textarea
  const [content, setContent] = useState<string>('');
  // State to hold the number of lines, derived from content
  const [lineCount, setLineCount] = useState<number>(1);

  // Refs to get direct access to the textarea and line number container DOM elements
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Effect to update line count whenever content changes
  useEffect(() => {
    // Split content by newline characters to count lines
    // Add 1 because even empty content has 1 line
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
      // Use 'leading-6' to match the 'line-height: 1.5em' (which is 24px for default 16px font)
      numbers.push(<div key={i} className="line-number h-6 flex items-center justify-end pr-2">{i}</div>);
    }
    return numbers;
  }, [lineCount]);

  return (
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
  );
}

export default App;
