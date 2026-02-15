// DEBUGGING SCRIPT - Check if login form is working
// Open browser console and paste this to test

console.log('=== LOGIN DEBUG TEST ===');

// Check if form exists
const form = document.querySelector('form');
console.log('Form found:', !!form);

// Check if submit button exists
const submitBtn = document.querySelector('button[type="submit"]');
console.log('Submit button found:', !!submitBtn);

// Check if inputs exist
const emailInput = document.querySelector('input[name="email"]');
const passwordInput = document.querySelector('input[name="password"]');
console.log('Email input found:', !!emailInput);
console.log('Password input found:', !!passwordInput);

// Check current values
console.log('Email value:', emailInput?.value);
console.log('Password length:', passwordInput?.value?.length);

// Check if form has onSubmit handler
console.log('Form has onSubmit:', !!form?.onsubmit);

// Try to manually trigger submit
console.log('Try clicking the submit button or pressing Enter in the password field');
