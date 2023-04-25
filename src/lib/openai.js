const { Configuration, OpenAIApi } = require('openai')

module.exports = {
    async getResponseChatGPT(prompt) {
        const apiKey = process.env.OPEN_AI_API_KEY
        const configuration = new Configuration({ apiKey })
        const openai = new OpenAIApi(configuration)

        const model = 'gpt-3.5-turbo'
        const messages = [{
                role: 'user',
                content: prompt
        }]

        const completion = await openai.createChatCompletion({ model, messages })
        return completion.data.choices[0].message;
    }

}