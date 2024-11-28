document.getElementById('ipForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const prefixesInput = document.getElementById('prefixes').value;
  const asn = document.getElementById('asn').value;
  const fileInput = document.getElementById('fileInput');

// Split the prefixes by comma or whitespace and trim any extra whitespace
const prefixList = prefixesInput.split(/[\s,]+/).map(prefix => prefix.trim()).filter(prefix => prefix !== '');


  // Clear previous results
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  // Show the loader
  showLoader();

  // Iterate over each prefix and check
  for (const prefix of prefixList) {
    const result = await checkPrefix(prefix, asn);

    // Check the backup files for the prefix in route filters
    const backupResults = await checkPrefixInBackups(prefix, fileInput.files);

    // Display the result with backup check information
    displayResult(result, backupResults);
  }

  // Hide the loader after all requests are completed
  hideLoader();
});

// Function to check if the prefix is present in backup files and return location details
async function checkPrefixInBackups(prefix, files) {
  const results = new Set(); // Use a Set to store unique terms found

  // List of terms to ignore
  const ignoredTerms = ['tw-customer-prefix', 'all-prefixes', 'customer-prefix'];

  for (const file of files) {
      const content = await readFileContent(file);
      const lines = content.split('\n');
      
      // Regular expression to match the prefix in a route filter
      const pattern = new RegExp(`route-filter.*${escapeRegExp(prefix)}`, 'i');
      
      // Iterate over each line to check if it matches the prefix
      for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
          if (pattern.test(lines[lineNumber])) {
              const termMatch = lines[lineNumber].match(/term\s([^\s]+)/);  // Extract term name from the line
              
              if (termMatch) {
                  const term = termMatch[1];

                  // Skip adding terms that should be ignored
                  if (!ignoredTerms.includes(term)) {
                      results.add(term);  // Add the unique term to the set
                  }
              }
          }
      }
  }

  return Array.from(results); // Convert Set to array and return
}

// Helper function to read file content
function readFileContent(file) {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
  });
}

// Function to escape special characters in regular expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Existing prefix check function with APNIC and RIPEstat
async function checkPrefix(prefix, asn) {
  const APNIC_WHOIS_URL = `https://rdap.apnic.net/ip/${prefix}`;
  const RIPESTAT_API_URL = 'https://stat.ripe.net/data/prefix-overview/data.json';
  
  let prefixOwner = 'Unknown';
  let isVisible = false;  

  // Check prefix ownership using APNIC WHOIS
  try {
      const apnicResponse = await fetch(APNIC_WHOIS_URL);
      if (apnicResponse.ok) {
          const apnicData = await apnicResponse.json();
          const entities = apnicData.entities || [];

          if (entities.length > 0) {
              const firstEntity = entities[0];
              const vcardArray = firstEntity.vcardArray || [];
              
              // Extract the organization name ('fn' field in vcardArray)
              if (vcardArray.length > 1) {
                  const vcardInfo = vcardArray[1];
                  for (const item of vcardInfo) {
                      if (item[0] === 'fn') {
                          prefixOwner = item[3];
                          break;
                      }
                  }
              }
          }
      }
  } catch (error) {
      console.error('Error fetching from APNIC:', error);
  }

// Check visibility over the internet using RIPEstat
try {
  const ripeResponse = await fetch(`${RIPESTAT_API_URL}?resource=${prefix}`);
  if (ripeResponse.ok) {
    const ripeData = await ripeResponse.json();
    if (ripeData.data && ripeData.data.asns) {
      const announcedAsns = ripeData.data.asns.map(asnData => asnData.asn);
      isVisible = announcedAsns.includes(parseInt(asn, 10));
    }
  }
} catch (error) {
  console.error('Error fetching from RIPEstat:', error);
}

return {
  prefix,
  prefixOwner,
  asn,
  isVisible
};
}

// Function to animate the loader percentage from 1% to 100%
function animateLoader() {
  const progressBar = document.querySelector('.loader-progress');
  const percentageText = document.querySelector('.loader-percentage');

  let progress = 0;
  const interval = setInterval(() => {
    if (progress >= 100) {
      clearInterval(interval);
      hideLoader(); // Hide the loader when it reaches 100%
    } else {
      progress++;
      progressBar.style.width = progress + '%'; // Update the width of the loader bar
      percentageText.textContent = progress + '%'; // Update the percentage text
    }
  }, 100); // Adjust the interval timing as necessary
}

// Function to display the result including backup file check with location details
function displayResult({ prefix, prefixOwner, asn, isVisible }, backupResults) {
  const resultsDiv = document.getElementById('results');
  
  // Create a result container if it doesn't exist
  let resultContainer = document.getElementById('resultContainer');
  if (!resultContainer) {
    resultContainer = document.createElement('div');
    resultContainer.id = 'resultContainer';
    resultsDiv.appendChild(resultContainer);
  }

  // Divider for multiple results
  if (resultContainer.children.length > 0) {
    const divider = document.createElement('hr');
    divider.textContent = '';
    resultContainer.appendChild(divider);
  }

  // Create a new result block
  const resultDiv = document.createElement('div');
  resultDiv.classList.add('result');

  // Check if prefix is found in backups
  const backupInfo = backupResults.length > 0 ?
    backupResults.map(result =>
      `<li>Found in Route Filter <strong>${result}</strong></li>`
    ).join('') :
    'Prefix is NOT found in any route filter.';

  // Set the result content
  resultDiv.innerHTML = `
    <p><strong>IP Pool:</strong> ${prefix}</p>
    <p><strong>Prefix is owned by:</strong> ${prefixOwner}</p>
    <p><strong>Visibility:</strong> ${isVisible ? `Prefix is visible over the internet via ASN <strong>${asn}</strong>.` : `Prefix is not visible over the internet via ASN ${asn}.`}</p>
    <p><strong>Route filter Check:</strong> ${backupInfo} </p>
  `;

  // Append the result to the container
  resultContainer.appendChild(resultDiv);

  // Add single Copy and Clear buttons if not already present
  if (!document.querySelector('.copy-btn')) {
    const copyButton = document.createElement('button');
    copyButton.classList.add('copy-btn');
    copyButton.textContent = 'Copy';
    copyButton.onclick = copyResults;

    const clearButton = document.createElement('button');
    clearButton.classList.add('clear-btn');
    clearButton.textContent = 'Clear';
    clearButton.onclick = clearResults;

    resultsDiv.appendChild(copyButton);
    resultsDiv.appendChild(clearButton);
  }
}

// Function to copy results to clipboard
function copyResults() {
  const resultContainer = document.getElementById('resultContainer');
  if (resultContainer) {
    // Use a temporary element to store the text content
    const tempElement = document.createElement('textarea');
    tempElement.value = resultContainer.innerText; // Only copy the visible text, not HTML
    document.body.appendChild(tempElement);
    tempElement.select();
    document.execCommand('copy');
    document.body.removeChild(tempElement);

    alert('Results copied to clipboard!');
  }
}


// Function to clear the results
function clearResults() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
}

// Call this function when you start loading data
function showLoader() {
  document.getElementById('loader').style.display = 'block';
  animateLoader(); // Start the loader animation
}

// Function to hide the loader
function hideLoader() {
  const loader = document.getElementById('loader');
  loader.style.visibility = 'hidden';
}

