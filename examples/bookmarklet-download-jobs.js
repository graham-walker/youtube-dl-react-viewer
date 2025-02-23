/* This bookmarklet runs any number of specified download jobs
 * 
 * USAGE:
 * 1. Create and copy an API key in the admin panel
 * 2. Copy the IDs of the jobs you want to download. Job IDs can be found under advanced options in the job editor in the admin panel
 * 3. Replace webAppUrl, apiKey, and jobIds in the code below with your values
 * 4. Create a new bookmark in your browser and paste the code below into the URL field
 */

javascript: (function () {
    const webAppUrl = 'http://localhost:5000'; /* Replace with your web app URL */
    const apiKey = 'ytdlrv-api-1740349357349-5f3976f694655ece89f0bfac6f798b9f88e3f031942aaac5e82c8eb276aee3a3'; /* Replace with your API key */
    const jobIds = ['678053b54e5a734c862f66aa', '678053fe4e5a734c862f66ab', '678054054e5a734c862f66ac']; /* Replace with the Job IDs you want to download */

    fetch(`${webAppUrl}/api/admin/jobs/download`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify(jobIds),
    }).then(response => response.json())
        .then(res => {
            alert((res.success ? '✅ ' + res.success : '') || (res.error ? '❌ ' + res.error : '') || '❌ Unknown error');
        })
        .catch(err => {
            if (err?.message === 'NetworkError when attempting to fetch resource.') err.error = 'CORS error';
            alert((err.error ? '❌ ' + err.error : '') || '❌ Unknown error');
        });
})();
