const { Configuration, OpenAIApi } = require('openai')
const apiKey = process.env.OPEN_AI_API_KEY

module.exports = {

    async getResponseChatGPT(prompt) {
        const configuration = new Configuration({ apiKey })
        const openai = new OpenAIApi(configuration)

        const model = 'gpt-3.5-turbo'
        const messages = [{
            role: 'user',
            content: prompt
        }]

        const completion = await openai.createChatCompletion({ model, messages })
        return completion.data.choices[0].message;
    },

    async checkGPT3Connectivity() {
        try {
            const response = await fetch('https://api.openai.com/v1/engines/gpt-3.5-turbo/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: 'Hello',
                    temperature: 0.5,
                    max_tokens: 10
                })
            })
            const data = await response.json()
            console.log('\n\n <<< OpenAI connection successful! >>> \n\n')
            return true
        } catch (err) {
            console.log(`\n\n <<< Error connecting to OpenAI API  >>> \n ${err} \n`)
            return false
        }
    }

}