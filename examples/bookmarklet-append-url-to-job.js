/* This bookmarklet appends the URL of the current page to a specified download job
 * 
 * USAGE:
 * 1. Create and copy an API key in the admin panel
 * 2. Copy the ID of the job you want to append URLs to. Job IDs can be found under advanced options in the job editor in the admin panel
 * 3. Replace webAppUrl, apiKey, and jobId in the code below with your values
 * 4. Create a new bookmark in your browser and paste the code below into the URL field
 */

javascript: (function () {
    const webAppUrl = 'http://localhost:5000'; /* Replace with your web app URL */
    const apiKey = 'ytdlrv-api-1740349357349-5f3976f694655ece89f0bfac6f798b9f88e3f031942aaac5e82c8eb276aee3a3'; /* Replace with your API key */
    const jobId = '678053b54e5a734c862f66aa'; /* Replace with the Job ID you want URLs appended to */
    
    const url = window.location.href;
    const title = document.title;

    fetch(`${webAppUrl}/api/admin/jobs/append/${jobId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify({ url, title }),
    }).then(response => response.json())
        .then(res => {
            alert((res.success ? '✅ ' + res.success : '') || (res.error ? '❌ ' + res.error : '') || '❌ Unknown error');
        })
        .catch(err => {
            if (err?.message === 'NetworkError when attempting to fetch resource.') err.error = 'CORS error';
            alert((err.error ? '❌ ' + err.error : '') || '❌ Unknown error');
        });
})();
