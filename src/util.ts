export const sleep = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout))
export const getTemplateLiteral = (str: string, context: object) => {
	return new Function('context', 'with(context) { return `' + str + '`; }')(context)
}
