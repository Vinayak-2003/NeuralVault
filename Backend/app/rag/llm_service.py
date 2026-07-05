from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq

from app.core.config import settings

def output_generation(retrieved_docs: str, query: str, temperature: float):
    try:
        print("___________output generation_____________")
        combined_input = PromptTemplate(
            template="""You are a strict document-based QA assistant.
                        Use ONLY the provided context to answer the question.
                        Context:
                        {retrieved_docs}

                        Question:
                        {query}

                        Rules:
                        - Do NOT use outside knowledge
                        - If answer is not in context → say "I don't know"
                        - Be concise and precise
                        - If possible, reference document numbers (e.g., Doc 1)

                        Answer:
                    """,
            input_variables=["retrieved_docs", "query"]
        )

        prompt = combined_input.format(retrieved_docs=retrieved_docs, query=query)

        print("__________prompt generated_____________", prompt)

        messages = [
            SystemMessage(content="You answer strictly from provided context."),
            HumanMessage(content=prompt)
        ]

        model = ChatGroq(
            model=settings.groq_chat_model,
            api_key=settings.GROQ_API_KEY,
            temperature=temperature,
        )
        response = model.invoke(messages)
        messages.append(AIMessage(content=response.content))

        print("__________response formatting started_____________")

        print("__________output generation response_____________", response)
        return response.content
    except Exception as e:
        print(f"Error in output generation: {e}")
        return "Sorry, I am having trouble generating the answer at the moment."
