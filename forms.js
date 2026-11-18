const endpoint = 'https://script.google.com/macros/s/AKfycbzAjG5Q_BVn-JWJiALp8LnNQzK04ZQCN1pDpqh8TAYP8qIli9WePilNBWaThzEUKgZ2jQ/exec';
const success = {
  booking: 'Your demo request was received. Check your email for a receipt. Your preferred slot is a request only.',
  enquiry: 'Your project enquiry was received. Check your email for a receipt.'
};

for (const id of Object.keys(success)) {
  const form = document.getElementById(id);
  const status = form.querySelector('.status');
  const button = form.querySelector('button[type="submit"]');
  if (!endpoint) {
    button.disabled = true;
    status.textContent = 'Online submissions are awaiting setup.';
    continue;
  }

  let previousBody;
  let requestId;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    status.className = 'status';
    status.textContent = 'Sending…';
    try {
      const data = new URLSearchParams(new FormData(form));
      if (data.toString() !== previousBody) {
        previousBody = data.toString();
        requestId = crypto.randomUUID();
      }
      data.set('request_id', requestId);
      await submitToAppsScript(data);
      form.reset();
      previousBody = undefined;
      status.className = 'status ok';
      status.textContent = success[id];
    } catch (error) {
      status.className = 'status err';
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

function submitToAppsScript(data) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.name = 'receipt-' + crypto.randomUUID();
    frame.hidden = true;
    frame.title = 'Submission receipt';

    const post = document.createElement('form');
    post.hidden = true;
    post.method = 'POST';
    post.action = endpoint;
    post.target = frame.name;
    for (const [name, value] of data) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      post.append(input);
    }

    const finish = (error) => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      frame.remove();
      post.remove();
      if (error) reject(Error(error));
      else resolve();
    };
    const receive = event => {
      if (!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin)) return;
      if (event.data?.type !== 'its-complicated-receipt' || event.data.id !== data.get('request_id')) return;
      finish(event.data.ok === true ? '' : 'The form service could not confirm your submission. Please check your details and retry.');
    };
    const timer = setTimeout(() => finish('No receipt arrived. Please check your email before retrying.'), 30000);
    window.addEventListener('message', receive);
    document.body.append(frame, post);
    post.submit();
  });
}
