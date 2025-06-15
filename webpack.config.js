// webpack.config.js (ESM)
import path from 'path'
import { fileURLToPath } from 'url'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CopyPlugin from 'copy-webpack-plugin'

// Polyfill __dirname for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
    entry: {
        main: './src/app.js'  // Updated path to new entry point
    },
    output: {
        path: path.resolve('dist'),
        filename: '[name].bundle.js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules\/(?!@triply).*/, // Allow @triply modules to be processed
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[hash:8][ext]'
                }
            },
            {
                test: /\.(png|svg)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'icons/[name][ext]' // Removed hash for simplicity
                }
            },
            {
                test: /favicon\.ico$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'favicon.ico'
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/html/index.html',
            favicon: './src/media/favicon.ico',
            minify: false
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash:8].css'
        }),
        new CopyPlugin({
            patterns: [
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/sw.js', to: 'sw.js' },
                { from: 'src/share-target.html', to: 'share-target.html' },
                { from: 'src/media/icon-192x192.png', to: 'icons/icon-192x192.png' },
                { from: 'src/media/icon-256x256.png', to: 'icons/icon-256x256.png' },
                { from: 'src/media/icon-background-512x512.png', to: 'icons/icon-background-512x512.png' },
                { from: 'src/media/icon-foreground-512x512.png', to: 'icons/icon-foreground-512x512.png' }
            ]
        })
    ],
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            // Add shortcut for imports
            '@': path.resolve(__dirname, 'src'),
            // Fix Excalidraw roughjs dependencies
            'roughjs/bin/rough': path.resolve(__dirname, 'node_modules/roughjs/bin/rough.js'),
            'roughjs/bin/generator': path.resolve(__dirname, 'node_modules/roughjs/bin/generator.js'),
            'roughjs/bin/math': path.resolve(__dirname, 'node_modules/roughjs/bin/math.js')
        }
    },
    devServer: {
        static: {
            directory: path.join(process.cwd(), 'dist')
        },
        compress: true,
        hot: true,
        port: 9002
    },
    optimization: {
        minimize: false // Disable minimization for development
    }
}