import React, { use,useRef, useState } from 'react';
import debugSys from '@mvc/water-app/debug';
import FilePicker from '@mvc/water-app/file-picker';
import { createServerInterface } from "@mvc/water-app/UI/components";
import Layout from "./components/Layout.jsx";

const openFile = createServerInterface('file-opening-interface', async () => {
    
    const file = await FilePicker.openFileDialog({
        filter: [
            { name: "Text Files", extensions: ["txt","md"] },
            { name: "All Files", extensions: ["*"] }
        ],
        title: "Open a text file",
        defaultExt: "txt",
    });

    //console.log('file',file);
    const text = file ? await Deno.readTextFile(file) : 'No file selected or operation canceled.';
    //console.log('File content:', text);
    return text;
});

const saveFile= createServerInterface('file-saving-interface', async (content) => {
    const file = await FilePicker.saveFileDialog({
        filter: "Text Files\0*.txt\0All Files\0*.*\0\0",
        title: "Save a text file",
        defaultExt: "txt",
    });

    if (file) {
        await Deno.writeTextFile(file, content);
    }
    else throw new Error('No file selected or operation canceled.');
});

function FilePickerExample(props) {
    const fileContentRef = useRef(null);
    const [fileContent, setFileContent] = useState('Open a file to see its content here.');

    const handleOpenFile = async () => {
        try {
            const text = await openFile();
            setFileContent(text);
            debugSys.log('File opened successfully.');
        } catch (error) {
            debugSys.error('Error opening file:', error);
        }
    };
    const handleSaveFile = async () => {
        try {
            const contentToSave = fileContentRef.current ? fileContentRef.current.innerText : '';
            await saveFile(contentToSave);
            debugSys.log('File saved successfully.');
        }
        catch (error) {
            debugSys.error('Error saving file:', error);
        }
    }

    return <Layout {...props}>
        <h1>File Picker Example</h1>
        <p>This is an example of using the File Picker component.</p>
        <button className="mx-1 btn btn-primary" onClick={handleOpenFile} >Open Text File</button>
        <button className="mx-1 btn btn-primary" onClick={handleSaveFile} >Save File</button>

        <div ref={fileContentRef} className="mt-3" contentEditable={true} style={{ whiteSpace: 'pre-wrap', border: '1px solid #ccc', padding: '10px', minHeight: '200px' }}>{fileContent}</div>

    </Layout>;
}

//auto hydrate
export default FilePickerExample;
