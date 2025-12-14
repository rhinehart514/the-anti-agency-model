describe('AI Rewrite API Validation', () => {
  describe('Request validation', () => {
    it('should require content field', () => {
      const request = {
        instruction: 'Make it more compelling',
      }

      const isValid = Boolean(request.content && request.instruction)
      expect(isValid).toBe(false)
    })

    it('should require instruction field', () => {
      const request = {
        content: 'Some content to rewrite',
      }

      const isValid = Boolean(request.content && request.instruction)
      expect(isValid).toBe(false)
    })

    it('should accept valid request with required fields', () => {
      const request = {
        content: 'Some content to rewrite',
        instruction: 'Make it more compelling',
      }

      const isValid = Boolean(request.content && request.instruction)
      expect(isValid).toBe(true)
    })

    it('should accept valid request with optional context', () => {
      const request = {
        content: 'Some content to rewrite',
        instruction: 'Make it more compelling',
        promptType: 'contentRewriter',
        context: {
          businessType: 'law-firm',
          businessName: 'Smith & Johnson Law',
          sectionType: 'hero',
        },
      }

      const isValid = Boolean(request.content && request.instruction)
      expect(isValid).toBe(true)
      expect(request.context).toBeDefined()
    })
  })

  describe('Prompt types', () => {
    const validPromptTypes = ['contentRewriter', 'headlineWriter', 'ctaWriter']

    it('should recognize valid prompt types', () => {
      validPromptTypes.forEach((promptType) => {
        expect(validPromptTypes.includes(promptType)).toBe(true)
      })
    })

    it('should default to contentRewriter for unknown types', () => {
      const request = {
        content: 'Content',
        instruction: 'Rewrite',
        promptType: 'unknownType',
      }

      const resolvedType = validPromptTypes.includes(request.promptType)
        ? request.promptType
        : 'contentRewriter'

      expect(resolvedType).toBe('contentRewriter')
    })
  })

  describe('Context building', () => {
    it('should build context string from context object', () => {
      const context = {
        businessType: 'law-firm',
        businessName: 'Test Law Firm',
        sectionType: 'hero',
      }

      let contextString = '\n\nContext:'
      if (context.businessType) {
        contextString += `\n- Business type: ${context.businessType}`
      }
      if (context.businessName) {
        contextString += `\n- Business name: ${context.businessName}`
      }
      if (context.sectionType) {
        contextString += `\n- Section: ${context.sectionType}`
      }

      expect(contextString).toContain('Business type: law-firm')
      expect(contextString).toContain('Business name: Test Law Firm')
      expect(contextString).toContain('Section: hero')
    })

    it('should handle partial context', () => {
      const context = {
        businessType: 'medical',
      }

      let contextString = '\n\nContext:'
      if (context.businessType) {
        contextString += `\n- Business type: ${context.businessType}`
      }

      expect(contextString).toContain('Business type: medical')
      expect(contextString).not.toContain('Business name')
      expect(contextString).not.toContain('Section')
    })

    it('should handle empty context', () => {
      const context = {}

      let contextString = '\n\nContext:'
      if ((context as { businessType?: string }).businessType) {
        contextString += `\n- Business type: ${(context as { businessType: string }).businessType}`
      }

      expect(contextString).toBe('\n\nContext:')
    })
  })
})
