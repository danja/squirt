// test/spec/rdf-model.spec.js
import { rdfModel } from '../../src/domain/rdf/model.js'
import rdf from 'rdf-ext'
import { RDFError } from '../../src/core/errors/error-types.js'

// No need for localStorage, state, or sparql mocks for testing createPostData

describe('RDFModel', () => {
    // No beforeEach needed if we're testing the singleton instance directly

    describe('createPostData', () => {
        it('should create RDF dataset for a basic post', () => {
            const postData = {
                type: 'entry',
                content: 'Test content'
            }
            const result = rdfModel.createPostData(postData)

            expect(result.id).toEqual(jasmine.any(String))
            expect(result.subject).toBeDefined()
            expect(result.dataset).toBeDefined()
            expect(result.dataset.size).toBeGreaterThan(1)

            // Check quad sizes
            expect(result.dataset.match(result.subject, rdfModel.ns.squirt('content')).size).toBe(1, 'Content quad size')
            expect(result.dataset.match(result.subject, rdfModel.ns.rdf('type')).size).toBe(1, 'Type quad size')
            expect(result.dataset.match(result.subject, rdfModel.ns.dc('created')).size).toBe(1, 'Created quad size')

            // Check one specific value using iteration (more robust than .toArray)
            let foundContent = null
            for (const quad of result.dataset.match(result.subject, rdfModel.ns.squirt('content'))) {
                foundContent = quad.object.value
                break
            }
            expect(foundContent).toBe('Test content')
        })

        it('should create RDF dataset for a link post', () => {
            const postData = {
                type: 'link',
                content: 'Check this out',
                title: 'Example Link',
                url: 'https://example.com',
                tags: ['link', 'test']
            }
            const result = rdfModel.createPostData(postData)

            expect(result.dataset.size).toBeGreaterThan(4)

            // Check quad sizes
            expect(result.dataset.match(result.subject, rdfModel.ns.dc('title')).size).toBe(1, 'Title quad size')
            expect(result.dataset.match(result.subject, rdfModel.ns.squirt('url')).size).toBe(1, 'URL quad size')
            expect(result.dataset.match(result.subject, rdfModel.ns.squirt('tag')).size).toBe(2, 'Tag quad size')
            expect(result.dataset.match(result.subject, rdfModel.ns.rdf('type')).size).toBe(1, 'Type quad size')
        })

        it('should create RDF dataset for a profile post with FOAF data', () => {
            const postData = {
                type: 'profile',
                customId: 'urn:test:profile',
                foafName: 'Test User',
                foafNick: 'tester',
                foafMbox: 'mailto:test@example.com',
                foafHomepage: 'https://tester.example.com',
                foafImg: 'https://tester.example.com/img.png',
                foafAccounts: [
                    { serviceHomepage: 'https://github.com', accountName: 'tester-gh' },
                    { serviceHomepage: 'https://mastodon.social', accountName: '@tester_mastodon' }
                ]
            }
            const result = rdfModel.createPostData(postData)

            expect(result.id).toBe('urn:test:profile')
            expect(result.dataset.size).toBeGreaterThan(7)

            // Check quad sizes
            expect(result.dataset.match(result.subject, rdfModel.ns.foaf('name')).size).toBe(1, 'FOAF name size')
            expect(result.dataset.match(result.subject, rdfModel.ns.foaf('account')).size).toBe(2, 'FOAF account size')
            expect(result.dataset.match(result.subject, rdfModel.ns.rdf('type')).size).toBe(1, 'Type quad size')
        })

        it('should handle custom properties', () => {
            const postData = {
                type: 'entry',
                content: 'Test',
                customString: 'hello',
                customNumber: 123,
                customBoolean: true,
                customUri: 'http://example.org/custom'
            }
            const result = rdfModel.createPostData(postData)

            // Check quad sizes
            expect(result.dataset.match(result.subject, rdfModel.ns.squirt('customString')).size).toBe(1, 'Custom string size')
            expect(result.dataset.match(result.subject, rdfModel.ns.squirt('customNumber')).size).toBe(1, 'Custom number size')
            expect(result.dataset.match(result.subject, rdfModel.ns.squirt('customBoolean')).size).toBe(1, 'Custom boolean size')
            expect(result.dataset.match(result.subject, rdfModel.ns.squirt('customUri')).size).toBe(1, 'Custom URI size')
        })

        it('should throw RDFError for invalid URL in link post', () => {
            const postData = {
                type: 'link',
                url: 'invalid-url'
            }
            // Use synchronous expect().toThrowError()
            expect(() => rdfModel.createPostData(postData))
                .toThrowError(RDFError, /Invalid URL format for link post: invalid-url/)
        })

        // Add more tests for edge cases: missing optional fields, different post types (wiki), etc.
    })
})