// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Get references to our HTML elements
    const webodmUpload = document.getElementById('webodm_upload');
    const qgisUpload = document.getElementById('qgis_upload');
    const packageButton = document.getElementById('package_button');

    packageButton.addEventListener('click', async () => {
        // --- 1. Get the uploaded files ---
        const webodmFiles = webodmUpload.files;
        const qgisFiles = qgisUpload.files;

        if (webodmFiles.length === 0 || qgisFiles.length === 0) {
            alert("Please upload both a WebODM folder and at least one GeoJSON file.");
            return;
        }

        // --- 2. Find the main JS file in the WebODM files ---
        let mainJsFile = null;
        let mainJsPath = '';
        for (const file of webodmFiles) {
            // A simple check for a likely candidate for the main JS file
            if (file.webkitRelativePath.includes('js/') && file.name.endsWith('.js')) {
                 mainJsFile = file;
                 mainJsPath = file.webkitRelativePath;
                 break; // Found it!
            }
        }
        
        if (!mainJsFile) {
            alert("Could not find the main JavaScript file in the WebODM folder.");
            return;
        }

        // --- 3. Generate the code to inject ---
        let codeToInject = `\n\n // --- Injected QGIS Layers ---\n`;
        for (const qgisFile of qgisFiles) {
            const layerName = qgisFile.name.replace('.geojson', '');
            const layerPath = `qgis_data/${qgisFile.name}`;
            
            // This is the same code snippet from our previous solution
            codeToInject += `
                const ${layerName}_source = new ol.source.Vector({ url: '${layerPath}', format: new ol.format.GeoJSON() });
                const ${layerName}_layer = new ol.layer.Vector({ source: ${layerName}_source, style: new ol.style.Style({stroke: new ol.style.Stroke({color: '#e60000', width: 3}), fill: new ol.style.Fill({color: 'rgba(230,0,0,0.2)'})}) });
                map.addLayer(${layerName}_layer);
            `;
        }
        
        // --- 4. Create a ZIP file in memory ---
        const zip = new JSZip();

        // Add the QGIS files to a new folder in the zip
        for (const qgisFile of qgisFiles) {
            zip.folder("qgis_data").file(qgisFile.name, qgisFile);
        }
        
        // Read the original main JS file, append our new code, and add it back
        const originalJsText = await mainJsFile.text();
        const modifiedJsText = originalJsText + codeToInject;
        zip.file(mainJsPath, modifiedJsText);

        // Add all other WebODM files to the zip, skipping the original JS file
        for (const file of webodmFiles) {
            if (file.webkitRelativePath !== mainJsPath) {
                zip.file(file.webkitRelativePath, file);
            }
        }

        // --- 5. Generate and trigger the download ---
        zip.generateAsync({type:"blob"}).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "packaged_map.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        alert("Packaging complete! Your download will begin shortly.");
    });
});
